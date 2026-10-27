import { BadRequestException, Injectable } from '@nestjs/common';
import { Db } from '../common/db';
import { User } from '../common/security';
@Injectable()
export class ReportingService {
  constructor(private readonly db: Db) {}
  async summary() {
    const row = (await this.db.one(`select count(*) as total_os,count(*) filter(where status not in ('FINALIZADA','CANCELADA')) as os_abertas,count(*) filter(where status='FINALIZADA') as os_finalizadas,count(*) filter(where status not in ('FINALIZADA','CANCELADA') and prazo<current_date) as os_vencidas,count(*) filter(where status not in ('FINALIZADA','CANCELADA') and prazo=current_date) as os_vencem_hoje,count(*) filter(where status not in ('FINALIZADA','CANCELADA') and responsavel_id is null) as os_sem_responsavel,coalesce(avg(extract(epoch from (finalizado_em-criado_em))/3600) filter(where status='FINALIZADA' and finalizado_em is not null),0)::float8 as tempo_medio_finalizacao_horas from ordens_servico`))!;
    const priorities = await this.db.query('select prioridade,count(*) as total from ordens_servico group by prioridade');
    const osPorPrioridade = Object.fromEntries(['BAIXA','MEDIA','ALTA','CRITICA'].map(p=>[p,priorities.find(r=>r.prioridade===p)?.total||0]));
    const settings = (await this.db.one('select * from configuracoes_os limit 1'))!;
    return {...row,osPorPrioridade,slaPorPrioridade:{CRITICA:settings.prazoCriticaDias,ALTA:settings.prazoAltaDias,MEDIA:settings.prazoMediaDias,BAIXA:settings.prazoBaixaDias}};
  }
  async statuses() { const rows = await this.db.query('select status,count(*) as total from ordens_servico group by status'); return Object.fromEntries(['RECEBIDA','EM_ANALISE','AGUARDANDO_APROVACAO','APROVADA','EM_DESENVOLVIMENTO','EM_TESTE','AGUARDANDO_PAGAMENTO','FINALIZADA','CANCELADA'].map(s=>[s,rows.find(r=>r.status===s)?.total||0])); }
  async productivity() { const s=await this.summary();return {totalOs:s.totalOs,osFinalizadas:s.osFinalizadas,percentualFinalizacao:s.totalOs?s.osFinalizadas*100/s.totalOs:0,tempoMedioFinalizacaoHoras:s.tempoMedioFinalizacaoHoras}; }
  async monthly() {
    const rows = await this.db.query(`select to_char(m,'YYYY-MM') as mes,extract(month from m)::int as numero,count(o.id) as total from generate_series(date_trunc('month',current_date)-interval '5 months',date_trunc('month',current_date),interval '1 month') m left join ordens_servico o on o.status='FINALIZADA' and o.finalizado_em >= m and o.finalizado_em < m+interval '1 month' group by m order by m`);
    const months=['jan.','fev.','mar.','abr.','mai.','jun.','jul.','ago.','set.','out.','nov.','dez.'];
    return rows.map(r=>({mes:r.mes,rotulo:months[r.numero-1]+'/'+r.mes.slice(2,4),total:r.total}));
  }
  async search(term: string,user:User) {
    if(typeof term!=='string'||term.length<2||term.length>100)throw new BadRequestException('O termo deve ter entre 2 e 100 caracteres.');
    const q=term.trim(),pattern='%'+q+'%',numeric=q.replace(/^ticket\s*#?\s*/i,'');
    const code=/^\d+$/.test(numeric)?numeric:null;
    const orders=await this.db.query(`select o.id,o.codigo,o.titulo,c.nome as cliente_nome from ordens_servico o join clientes c on c.id=o.cliente_id where ($2::bigint is not null and o.codigo=$2 or o.titulo ilike $1 or o.descricao ilike $1 or c.nome ilike $1) and ($3::uuid is null or o.responsavel_id=$3) order by o.atualizado_em desc limit 5`,[pattern,code,user.perfil==='ADMIN'?null:user.id]);
    const ordensServico=orders.map(r=>({id:r.id,titulo:`Ticket #${r.codigo} - ${r.titulo}`,subtitulo:r.clienteNome,href:'/ordens-servico/'+r.id}));
    if(user.perfil!=='ADMIN')return {ordensServico,clientes:[],projetos:[],usuarios:[]};
    const list=async(sql:string,path:string)=> (await this.db.query(sql,[pattern])).map(r=>({id:r.id,titulo:r.titulo,subtitulo:r.subtitulo,href:`${path}?busca=${encodeURIComponent(q)}`}));
    const [clientes,projetos,usuarios]=await Promise.all([
      list('select id,nome as titulo,email as subtitulo from clientes where nome ilike $1 order by nome limit 5','/clientes'),
      list('select p.id,p.nome as titulo,c.nome as subtitulo from projetos p left join clientes c on c.id=p.cliente_id where p.nome ilike $1 order by p.nome limit 5','/projetos'),
      list('select id,email as titulo,nome as subtitulo from usuarios where email ilike $1 order by email limit 5','/usuarios')
    ]);
    return {ordensServico,clientes,projetos,usuarios};
  }
}
