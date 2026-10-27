import { BadRequestException, UnprocessableEntityException, Injectable, NotFoundException } from '@nestjs/common';
import { Db } from '../common/db';
import { IntegrationsService } from '../integrations/integrations.service';
import { OrdersService, ORDER_SELECT, localDate } from './orders.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class OrderExtrasService {
  constructor(private readonly db: Db, private readonly orders: OrdersService, private readonly integrations: IntegrationsService) {}

  async comments(id: string, user?: any) {
    await this.orders.assertAccess(id, user);
    return this.db.query(`select c.*,u.nome as usuario_nome from comentarios c join usuarios u on u.id=c.usuario_id where c.ordem_servico_id=$1 order by c.criado_em`, [id]);
  }
  async comment(id: string, body: any, user: any) {
    return this.db.transaction(async () => {
      const order = await this.orders.assertAccess(id, user);
      const result = await this.db.insert('comentarios', { ordemServicoId: id, usuarioId: user.id, mensagem: body.mensagem });
      await this.orders.notify(order, 'COMENTARIO', 'Novo comentario no ticket', `O ticket ${order.codigo} recebeu um novo comentario de ${user.nome}.`);
      return { ...result, usuarioNome: user.nome };
    });
  }
  async checklist(id: string, user?: any) {
    await this.orders.assertAccess(id, user);
    return this.db.query('select * from checklist_itens where ordem_servico_id=$1 order by criado_em', [id]);
  }
  async createChecklist(id: string, body: any, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.orders.assertAccess(id, user);
      const result = await this.db.insert('checklist_itens', { ordemServicoId: id, descricao: body.descricao, obrigatorio: body.obrigatorio === true, concluido: false });
      await this.orders.notify(order, 'CHECKLIST', 'Checklist atualizado', `O checklist do ticket ${order.codigo} foi atualizado: novo item ${body.descricao}.`);
      return result;
    });
  }
  async finishChecklist(id: string, user?: any) {
    return this.db.transaction(async () => {
      const item = await this.db.one('select * from checklist_itens where id=$1', [id]);
      if (!item) throw new NotFoundException('Item de checklist nao encontrado.');
      const order = await this.orders.assertAccess(item.ordemServicoId, user);
      const result = await this.db.update('checklist_itens', id, { concluido: true, concluidoEm: new Date() });
      await this.orders.notify(order, 'CHECKLIST', 'Checklist atualizado', `O checklist do ticket ${order.codigo} foi atualizado: item concluido ${item.descricao}.`);
      return result;
    });
  }
  async timeEntries(id: string, user?: any) {
    await this.orders.assertAccess(id, user);
    return this.db.query('select a.*,u.nome as usuario_nome from apontamentos_tempo a join usuarios u on u.id=a.usuario_id where a.ordem_servico_id=$1 order by a.inicio desc', [id]);
  }
  async timeEntry(id: string, body: any, user: any) {
    const start = new Date(body.inicio), end = new Date(body.fim);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new UnprocessableEntityException('Fim deve ser posterior ao inicio.');
    return this.db.transaction(async () => {
      const order = await this.orders.assertAccess(id, user);
      const result = await this.db.insert('apontamentos_tempo', { ordemServicoId: id, usuarioId: user.id, descricao: body.descricao, inicio: start, fim: end, duracaoMinutos: Math.floor((end.getTime() - start.getTime()) / 60000) });
      await this.orders.notify(order, 'APONTAMENTO', 'Apontamento de tempo atualizado', `O ticket ${order.codigo} teve apontamento de tempo atualizado por ${user.nome}: novo apontamento registrado.`);
      return { ...result, usuarioNome: user.nome };
    });
  }
  async audit(id: string, user?: any) {
    await this.orders.assertAccess(id, user);
    return this.db.query('select a.*,u.nome as usuario_nome from auditoria_os a left join usuarios u on u.id=a.usuario_id where a.ordem_servico_id=$1 order by a.criado_em desc', [id]);
  }

  async calendar(query: any, user?: any) {
    const { inicio, fim } = query;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio || '') || !/^\d{4}-\d{2}-\d{2}$/.test(fim || '')) throw new BadRequestException('Informe as datas de inicio e fim no formato AAAA-MM-DD.');
    const days = (new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000 + 1;
    if (days < 1) throw new UnprocessableEntityException('A data final deve ser igual ou posterior a data inicial.');
    if (days > 366) throw new UnprocessableEntityException('O intervalo do calendario deve ter no maximo 366 dias.');
    const params: any[] = [inicio, fim];
    let filter = ' where (o.prazo between $1::date and $2::date or o.finalizado_em::date between $1::date and $2::date)';
    for (const [key, column] of Object.entries({ responsavelId: 'responsavel_id', clienteId: 'cliente_id', projetoId: 'projeto_id', prioridade: 'prioridade', status: 'status' })) {
      if (query[key]) { params.push(query[key]); filter += ` and o.${column}=$${params.length}`; }
    }
    if (user?.perfil === 'DESENVOLVEDOR') { params.push(user.id); filter += ` and o.responsavel_id=$${params.length}`; }
    const orders = await this.db.query(ORDER_SELECT + filter, params);
    const events: any[] = [];
    const add = (order: any, date: string, type: string) => {
      if (date < inicio || date > fim) return;
      events.push({ id: order.id + ':' + type, tipo: type, data: date, ordemServicoId: order.id, ordemServicoCodigo: order.codigo,
        titulo: order.titulo, clienteId: order.clienteId, clienteNome: order.clienteNome, projetoId: order.projetoId, projetoNome: order.projetoNome,
        responsavelId: order.responsavelId, responsavelNome: order.responsavelNome, prioridade: order.prioridade, status: order.status });
    };
    for (const order of orders) {
      if (order.prazo) {
        const type = order.status === 'AGUARDANDO_PAGAMENTO' && order.cobrar && !order.paga ? 'VENCIMENTO'
          : ['APROVADA', 'EM_DESENVOLVIMENTO', 'EM_TESTE'].includes(order.status) ? 'ENTREGA_PREVISTA' : 'PRAZO_OS';
        add(order, localDate(order.prazo), type);
      }
      if (order.finalizadoEm) add(order, localDate(order.finalizadoEm), 'EVENTO_IMPORTANTE');
    }
    return events.sort((a, b) => a.data.localeCompare(b.data) || a.ordemServicoCodigo - b.ordemServicoCodigo || a.tipo.localeCompare(b.tipo));
  }

  async suggestedBranch(id: string, user?: any) {
    const order = await this.orders.assertAccess(id, user);
    const title = order.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `os-${order.codigo}-${title}`;
  }
  async branch(id: string, branch: string, user?: any) {
    await this.orders.assertAccess(id, user);
    await this.orders.change(id, { branchGithub: branch.trim(), pullRequestNumero: null, pullRequestUrl: null, pullRequestStatus: null, commitsGithub: null, arquivosAlteradosGithub: null, ultimaSincronizacaoGithub: null });
    return this.orders.response(await this.orders.assertAccess(id));
  }
  async github(id: string, user?: any) {
    const order = await this.orders.assertAccess(id, user);
    if (!order.branchGithub?.trim()) throw new UnprocessableEntityException('Vincule uma branch GitHub o ticket antes de sincronizar.');
    const { commits, pr, arquivos } = await this.integrations.githubSync(order.branchGithub);
    await this.orders.change(id, {
      commitsGithub: JSON.stringify(commits), arquivosAlteradosGithub: JSON.stringify(arquivos),
      pullRequestNumero: pr?.numero ?? null, pullRequestUrl: pr?.url ?? null,
      pullRequestStatus: pr?.status?.toUpperCase() ?? null, ultimaSincronizacaoGithub: new Date(),
    });
    return this.orders.response(await this.orders.assertAccess(id));
  }
  async ai(id: string, user?: any) {
    const order = await this.orders.find(id, user);
    const entries = (await this.timeEntries(id, user)).slice(0, 100).map(row => ({ descricao: row.descricao, inicio: row.inicio, fim: row.fim, duracaoMinutos: row.duracaoMinutos }));
    return this.integrations.generateAnalysis({ codigo: order.codigo, titulo: order.titulo, descricao: order.descricao,
      status: order.status, prioridadeAtual: order.prioridade, prazo: order.prazo, entendimento: order.entendimento,
      impacto: order.impacto, riscos: order.riscos, estimativaHoras: order.estimativaHoras,
      descricaoFinalizacao: order.descricaoFinalizacao, commits: order.commitsFinalizacao,
      arquivosAlterados: order.arquivosAlteradosFinalizacao, apontamentos: entries });
  }

  async pdf(id: string, user?: any): Promise<{ buffer: Buffer; codigo: number }> {
    const order = await this.orders.assertAccess(id, user);
    if (order.status !== 'FINALIZADA') throw new UnprocessableEntityException('O comprovante somente pode ser gerado para um ticket finalizado.');
    const events = (await this.audit(id, user)).reverse();
    const document = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 48, left: 42, right: 42 }, info: { Title: `Comprovante de finalizacao - ticket ${order.codigo}`, Subject: 'Evidencia formal da execucao do ticket', Creator: 'NexusOS' } });
    const chunks: Buffer[] = [];
    const finished = new Promise<Buffer>((resolve, reject) => { document.on('data', chunk => chunks.push(chunk)); document.on('end', () => resolve(Buffer.concat(chunks))); document.on('error', reject); });
    const text = (value: any) => value == null || String(value).trim() === '' ? 'Nao informado' : String(value);
    const date = (value: any) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: process.env.TZ || 'America/Cuiaba', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Nao informada';
    const money = (value: any) => value == null ? 'Nao informado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
    const ensureSpace = (height = 45) => { if (document.y + height > document.page.height - 48) document.addPage(); };
    const section = (title: string) => { ensureSpace(); document.moveDown(0.6).font('Helvetica-Bold').fontSize(11).fillColor('#1e40af').text(title).moveDown(0.4); };
    const paragraph = (title: string, value: any) => { section(title); document.font('Helvetica').fontSize(9).fillColor('#374151').text(text(value), { lineGap: 3 }); };
    const fields = (title: string, values: [string, any][]) => {
      section(title);
      for (const [label, value] of values) {
        const formatted = text(value), labelWidth = 160, valueWidth = 329;
        document.font('Helvetica').fontSize(9);
        const height = Math.max(25, document.heightOfString(formatted, { width: valueWidth - 12 }) + 12);
        ensureSpace(height);
        const y = document.y;
        document.save().rect(42, y, labelWidth, height).fillAndStroke('#f9fafb', '#d1d5db').rect(42 + labelWidth, y, valueWidth, height).stroke('#d1d5db').restore();
        document.font('Helvetica-Bold').fillColor('#4b5563').text(label, 48, y + 6, { width: labelWidth - 12 });
        document.font('Helvetica').fillColor('#374151').text(formatted, 48 + labelWidth, y + 6, { width: valueWidth - 12 });
        document.x = 42; document.y = y + height;
      }
    };
    document.font('Helvetica-Bold').fontSize(18).fillColor('#1e40af').text('COMPROVANTE DE FINALIZACAO', { align: 'center' });
    document.font('Helvetica').fontSize(11).fillColor('#4b5563').text(`Ticket ${order.codigo}`, { align: 'center' }).moveDown();
    fields('Identificacao', [['Codigo', order.codigo], ['Titulo', order.titulo], ['Status', 'Finalizada'], ['Prioridade', order.prioridade], ['Cliente', order.clienteNome], ['Documento', order.clienteDocumento], ['E-mail', order.clienteEmail], ['Telefone', order.clienteTelefone], ['Projeto', order.projetoNome], ['Responsavel', order.responsavelNome]]);
    fields('Datas e valores', [['Criada em', date(order.criadoEm)], ['Atualizada em', date(order.atualizadoEm)], ['Prazo', order.prazo ? localDate(order.prazo).split('-').reverse().join('/') : null], ['Finalizada em', date(order.finalizadoEm)], ['Estimativa', order.estimativaHoras == null ? null : `${order.estimativaHoras} hora(s)`], ['Valor da hora', money(order.clienteValorHora)], ['Valor total estimado', money(order.valorTotalEstimado)], ['Cobranca', order.cobrar ? 'Cobrada' : 'Sem cobranca'], ['Pagamento', order.paga ? 'Pago' : 'Pendente']]);
    for (const [title, key] of [['Demanda original', 'descricao'], ['Entendimento e analise', 'entendimento'], ['Impacto', 'impacto'], ['Riscos', 'riscos'], ['Entrega realizada', 'descricaoFinalizacao'], ['Arquivos alterados', 'arquivosAlteradosFinalizacao']]) paragraph(title, order[key]);
    fields('Referencias tecnicas', [['Branch', order.branchFinalizacao], ['Commits', order.commitsFinalizacao]]);
    fields('Aceite do cliente', [['Decisao', order.aprovadaPeloCliente == null ? 'Nao registrado' : order.aprovadaPeloCliente ? 'Aprovado' : 'Reprovado'], ['Registrado em', date(order.aprovadoPeloClienteEm)], ['Observacao', order.observacaoAprovacaoCliente]]);
    section('Historico completo');
    if (!events.length) document.font('Helvetica').fontSize(9).fillColor('#374151').text('Nenhum evento registrado.');
    for (const event of events) {
      ensureSpace();
      const status = event.statusAnterior || event.statusNovo ? ` [${text(event.statusAnterior)} -> ${text(event.statusNovo)}]` : '';
      document.font('Helvetica').fontSize(9).fillColor('#374151').text(`${date(event.criadoEm)} | ${event.tipoEvento.replace(/_/g, ' ')} | ${event.usuarioNome || 'Sistema'}${status}\n${event.descricao}`, { lineGap: 3 }).moveDown(0.5);
    }
    document.moveDown().font('Helvetica-Oblique').fontSize(8).fillColor('#4b5563').text(`Documento emitido pelo NexusOS em ${date(new Date())}. A autenticidade deve ser conferida com os registros do ticket ${order.codigo}.`);
    document.end();
    return { buffer: await finished, codigo: order.codigo };
  }
}
