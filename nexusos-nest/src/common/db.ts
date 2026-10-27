import './env';
import { Injectable, Global, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, types } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

types.setTypeParser(20, value => { const n = Number(value); if (!Number.isSafeInteger(n)) throw new Error('Inteiro PostgreSQL excede precisão JSON'); return n; });
types.setTypeParser(1700, Number);
types.setTypeParser(1082, value => value);
export function camel(value: any): any {
  if (value == null || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(camel);
  if (typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), camel(item)]));
}
const snake = (key: string) => key.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
function ident(value: string) { if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error('Identificador SQL inválido'); return '"' + value + '"'; }

@Injectable()
export class Db implements OnModuleDestroy {
  readonly pool: Pool;
  private readonly context = new AsyncLocalStorage<PoolClient>();
  private readonly columns = new Map<string, Map<string, any>>();
  constructor() {
    let connectionString = process.env.SPRING_DATASOURCE_URL || process.env.DATABASE_JDBC_URL || process.env.DATABASE_URL;
    if (connectionString?.startsWith('jdbc:')) connectionString = connectionString.slice(5);
    const opts: any = connectionString ? { connectionString } : { host: process.env.PGHOST || 'localhost', port: Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432), database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'nexusos' };
    const username = process.env.SPRING_DATASOURCE_USERNAME || process.env.PGUSER || process.env.DATABASE_USERNAME;
    const password = process.env.SPRING_DATASOURCE_PASSWORD || process.env.PGPASSWORD || process.env.DATABASE_PASSWORD;
    if (username) opts.user = username; else if (!connectionString) opts.user = process.env.POSTGRES_USER || 'nexusos';
    if (password) opts.password = password; else if (!connectionString) opts.password = process.env.POSTGRES_PASSWORD || 'nexusos';
    if (process.env.PGSSL === 'true') opts.ssl = { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' };
    this.pool = new Pool({ ...opts, max: Number(process.env.DB_POOL_SIZE || 10), connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
    this.pool.on('error', error => console.error('PostgreSQL pool:', error.message));
  }
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await (this.context.getStore() || this.pool).query(sql, params);
    return camel(result.rows || []) as T[];
  }
  async one<T = any>(sql: string, params: any[] = []): Promise<T | undefined> { return (await this.query<T>(sql, params))[0]; }
  camel(value: any) { return camel(value); }
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return fn();
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await this.context.run(client, fn); await client.query('COMMIT'); return result; }
    catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  }
  private async metadata(table: string) {
    if (!this.columns.has(table)) {
      ident(table);
      const columns = await this.query(`select column_name, data_type, column_default from information_schema.columns where table_schema=current_schema() and table_name=$1`, [table]);
      this.columns.set(table, new Map(columns.map(c => [c.columnName, c])));
    }
    return this.columns.get(table)!;
  }
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const meta = await this.metadata(table);
    const values: Record<string, any> = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined).map(([k, v]) => [snake(k), v]));
    if (meta.get('id')?.dataType === 'uuid' && !values.id) values.id = randomUUID();
    for (const col of ['criado_em', 'atualizado_em']) if (meta.has(col) && values[col] === undefined && !meta.get(col).columnDefault) values[col] = new Date();
    const keys = Object.keys(values);
    if (!keys.length) return this.one(`insert into ${ident(table)} default values returning *`);
    return this.one(`insert into ${ident(table)} (${keys.map(ident).join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, Object.values(values));
  }
  async update(table: string, id: string | number, data: Record<string, any>): Promise<any> {
    const meta = await this.metadata(table);
    const values: Record<string, any> = Object.fromEntries(Object.entries(data).filter(([k, v]) => k !== 'id' && v !== undefined).map(([k, v]) => [snake(k), v]));
    if (meta.has('atualizado_em')) values.atualizado_em = new Date();
    const keys = Object.keys(values);
    if (!keys.length) return this.one(`select * from ${ident(table)} where id=$1`, [id]);
    return this.one(`update ${ident(table)} set ${keys.map((k, i) => `${ident(k)}=$${i + 2}`).join(',')} where id=$1 returning *`, [id, ...Object.values(values)]);
  }
  async onModuleDestroy() { await this.pool.end(); }
}
@Global()
@Module({ providers: [Db], exports: [Db] })
export class DatabaseModule {}
