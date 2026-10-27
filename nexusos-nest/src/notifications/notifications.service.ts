import { Global, Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy, UnprocessableEntityException } from '@nestjs/common';
import { Db } from '../common/db';
import { notFound } from '../common/helpers';
const preferences: Record<string,string> = { OS_ATRIBUIDA: 'ATRIBUICAO', PRAZO_VENCIDO: 'PRAZO_VENCIDO', APROVACAO_CLIENTE: 'APROVACAO_CLIENTE', PAGAMENTO: 'PAGAMENTO', COMENTARIO: 'COMENTARIO', ALTERACAO_STATUS: 'STATUS' };
const select = `select n.id,n.ordem_servico_id,o.codigo as ordem_servico_codigo,n.solicitacao_id,s.codigo as solicitacao_codigo,n.tipo,n.titulo,n.mensagem,n.lida,n.criado_em,n.lida_em from notificacoes n left join ordens_servico o on o.id=n.ordem_servico_id left join solicitacoes s on s.id=n.solicitacao_id`;
@Injectable()
export class NotificationsService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private readonly db: Db) {}
  onApplicationBootstrap() {
    const schedule = () => { const now = new Date(); const next = new Date(now); next.setMinutes(0,0,0); next.setHours(Math.floor(now.getHours()/6)*6+6); this.timer = setTimeout(async () => { try { await this.deadlines(); } catch (e: any) { this.logger.error(e.stack || e.message); } schedule(); }, next.getTime()-Date.now()); this.timer.unref(); };
    schedule();
  }
  onModuleDestroy() { if (this.timer) clearTimeout(this.timer); }
  async notify(type: string, title: string, message: string, options: {orderId?: string; requestId?: string; userIds?: string[]; referenceDate?: string; deduplicate?: boolean} = {}) {
    const users = options.userIds ? [...new Set(options.userIds)].map(id => ({id})) : await this.db.query(`select id from usuarios where ativo=true and perfil='ADMIN'`);
    const configurable = Object.keys(preferences).find(k => preferences[k] === type);
    for (const user of users) {
      if (configurable && await this.db.one('select id from preferencias_notificacao where usuario_id=$1 and tipo=$2 and habilitada=false', [user.id, configurable])) continue;
      if (options.deduplicate && await this.db.one('select id from notificacoes where usuario_id=$1 and tipo=$2 and ordem_servico_id is not distinct from $3 and solicitacao_id is not distinct from $4 and referencia_data is not distinct from $5::date', [user.id, type, options.orderId || null, options.requestId || null, options.referenceDate || null])) continue;
      await this.db.insert('notificacoes', { usuarioId: user.id, ordemServicoId: options.orderId || null, solicitacaoId: options.requestId || null, tipo: type, titulo: title.slice(0,180), mensagem: message, referenciaData: options.referenceDate || null, lida: false });
    }
  }
  async list(userId: string) { return { naoLidas: (await this.db.one('select count(*) as total from notificacoes where usuario_id=$1 and lida=false', [userId]))!.total, itens: await this.db.query(select + ' where n.usuario_id=$1 order by n.criado_em desc limit 20', [userId]) }; }
  async history(userId: string, q: any) {
    const pagina = Math.max(Number(q.pagina) || 1, 1), tamanho = Math.min(Math.max(Number(q.tamanho) || 20, 1),100);
    const params: any[] = [userId], filters = ['n.usuario_id=$1'];
    if (q.tipo?.trim()) { params.push(q.tipo.trim()); filters.push(`n.tipo=$${params.length}`); }
    if (q.lida !== undefined) { if (!['true','false'].includes(q.lida)) throw new UnprocessableEntityException('Filtro lida inválido.'); params.push(q.lida === 'true'); filters.push(`n.lida=$${params.length}`); }
    const where = ' where ' + filters.join(' and ');
    const totalItens = (await this.db.one('select count(*) as total from notificacoes n' + where, params))!.total;
    const itens = await this.db.query(select + where + ` order by n.criado_em desc limit $${params.length+1} offset $${params.length+2}`, [...params,tamanho,(pagina-1)*tamanho]);
    return { naoLidas: (await this.db.one('select count(*) as total from notificacoes where usuario_id=$1 and lida=false', [userId]))!.total, totalItens, pagina, tamanho, totalPaginas: Math.max(Math.ceil(totalItens/tamanho),1), tiposDisponiveis: (await this.db.query('select distinct tipo from notificacoes where usuario_id=$1 order by tipo', [userId])).map(r=>r.tipo), itens };
  }
  async read(userId: string, id?: string) {
    if (id) notFound(await this.db.one('select id from notificacoes where id=$1 and usuario_id=$2',[id,userId]),'Notificação não encontrada.');
    await this.db.query(`update notificacoes set lida=true,lida_em=now() where usuario_id=$1 and lida=false${id?' and id=$2':''}`, id?[userId,id]:[userId]);
  }
  async preferences(userId: string) { const stored = await this.db.query('select tipo,habilitada from preferencias_notificacao where usuario_id=$1',[userId]); return { preferencias: Object.keys(preferences).map(tipo => ({tipo,habilitada: stored.find(r=>r.tipo===tipo)?.habilitada ?? true})) }; }
  async setPreferences(userId: string, items: any[]) {
    if (!Array.isArray(items) || items.length !== 6 || new Set(items.map(i=>i.tipo)).size !== 6 || items.some(i=>!Object.hasOwn(preferences,i.tipo) || typeof i.habilitada !== 'boolean')) throw new UnprocessableEntityException('Informe todos os tipos de notificação uma única vez.');
    await this.db.transaction(async()=>{ for (const item of items) await this.db.query('insert into preferencias_notificacao(id,usuario_id,tipo,habilitada,criado_em,atualizado_em) values(gen_random_uuid(),$1,$2,$3,now(),now()) on conflict(usuario_id,tipo) do update set habilitada=excluded.habilitada,atualizado_em=now()', [userId,item.tipo,item.habilitada]); });
    return this.preferences(userId);
  }
  async deadlines() {
    await this.db.transaction(async()=>{
      const lock = await this.db.one('select pg_try_advisory_xact_lock(18082027) as acquired'); if (!lock?.acquired) return;
      const today = (await this.db.one('select current_date::text as day'))!.day;
      const orders = await this.db.query(`select *,prazo-current_date as dias,current_date-atualizado_em::date as parado from ordens_servico where responsavel_id is not null and status not in ('FINALIZADA','CANCELADA') and prazo is not null`);
      for(const order of orders) {
        if (order.dias <= 2) {
          const type = order.dias < 0 ? 'PRAZO_VENCIDO' : 'PRAZO_PROXIMO';
          const title = order.dias < 0 ? 'Prazo do ticket vencido' : 'Prazo do ticket próximo';
          const message = `O ticket ${order.codigo} ${order.dias < 0 ? `venceu em ${order.prazo}` : order.dias===0?'vence hoje':order.dias===1?'vence amanhã':'vence em 2 dias'}.`;
          const options = { orderId: order.id, referenceDate: order.prazo, deduplicate: true };
          await this.notify(type,title,message,options);
          const dev = await this.db.one(`select id from usuarios where id=$1 and perfil='DESENVOLVEDOR' and ativo=true`,[order.responsavelId]);
          if (dev) await this.notify(type,title,message,{...options,userIds:[dev.id]});
        }
        if(order.parado>=3) await this.notify('OS_PARADA',`Ticket parado há ${order.parado} dias`,`O ticket ${order.codigo} está sem atualização há ${order.parado} dias.`,{orderId:order.id,referenceDate:today,deduplicate:true});
      }
    });
  }
}
