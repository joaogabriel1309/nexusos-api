import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Db } from './common/db';
export async function migrate(db: Db) {
  await db.transaction(async () => {
    await db.query('select pg_advisory_xact_lock(18082026)');
    await db.query('create table if not exists nest_schema_history(version integer primary key, script text not null, checksum text not null, installed_at timestamptz not null default now(), adopted_from_flyway boolean not null default false)');
    const hasFlyway = (await db.one(`select to_regclass('public.flyway_schema_history') as name`))?.name;
    const flyway = new Set(hasFlyway ? (await db.query('select version from flyway_schema_history where success=true and version is not null')).map(r => Number(r.version)) : []);
    const directory = resolve(__dirname, '../migrations');
    const scripts = (await readdir(directory)).filter(f => /^V\d+__.*\.sql$/.test(f)).sort((a, b) => Number(a.match(/^V(\d+)/)![1]) - Number(b.match(/^V(\d+)/)![1]));
    for (const script of scripts) {
      const version = Number(script.match(/^V(\d+)/)![1]);
      const sql = await readFile(resolve(directory, script), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await db.one('select * from nest_schema_history where version=$1', [version]);
      if (existing) { if (existing.checksum !== checksum) throw new Error('Migração alterada após aplicação: ' + script); continue; }
      const adopted = flyway.has(version);
      if (!adopted) await db.query(sql);
      await db.query('insert into nest_schema_history(version,script,checksum,adopted_from_flyway) values($1,$2,$3,$4)', [version, script, checksum, adopted]);
      console.log(`${adopted ? 'Adotada do Flyway' : 'Aplicada'}: ${script}`);
    }
  });
}
