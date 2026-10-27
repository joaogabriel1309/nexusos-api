import { UnprocessableEntityException, Injectable, NotFoundException } from '@nestjs/common';
import { Db } from '../common/db';
import { audit, uuid } from '../common/helpers';
import { IntegrationsService } from '../integrations/integrations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PRIORITIES, STATUSES } from './orders.dto';

const TRANSITIONS: Record<string, string[]> = {
  RECEBIDA: ['EM_ANALISE'], EM_ANALISE: ['AGUARDANDO_APROVACAO'],
  AGUARDANDO_APROVACAO: ['APROVADA', 'EM_ANALISE'], APROVADA: ['EM_DESENVOLVIMENTO'],
  EM_DESENVOLVIMENTO: ['EM_TESTE'], EM_TESTE: ['AGUARDANDO_PAGAMENTO', 'EM_DESENVOLVIMENTO'],
  AGUARDANDO_PAGAMENTO: ['FINALIZADA', 'EM_DESENVOLVIMENTO'], FINALIZADA: [], CANCELADA: [],
};
export const ORDER_SELECT = `select o.*, c.nome as cliente_nome, c.valor_hora as cliente_valor_hora,
  c.documento as cliente_documento, c.email as cliente_email, c.telefone as cliente_telefone,
  u.nome as responsavel_nome, u.email as responsavel_email, u.perfil as responsavel_perfil,
  p.nome as projeto_nome from ordens_servico o join clientes c on c.id=o.cliente_id
  left join usuarios u on u.id=o.responsavel_id left join projetos p on p.id=o.projeto_id`;
const OPTIONAL = (value: any) => typeof value === 'string' && value.trim() ? value.trim() : null;
export const localDate = (value: any = new Date()): string => {
  if (typeof value === 'string') return value.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: process.env.TZ || 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
};

@Injectable()
export class OrdersService {
  constructor(private readonly db: Db, private readonly integrations: IntegrationsService, private readonly notifications: NotificationsService) {}

  async assertAccess(id: string, user?: any) {
    const params: any[] = [id];
    let where = ' where o.id=$1';
    if (user?.perfil === 'DESENVOLVEDOR') { params.push(user.id); where += ' and o.responsavel_id=$2'; }
    const order = await this.db.one(ORDER_SELECT + where, params);
    if (!order) throw new NotFoundException('Ticket nao encontrada.');
    return order;
  }

  async response(order: any, user?: any, transitions = false): Promise<any> {
    const { clienteValorHora, clienteDocumento, clienteEmail, clienteTelefone, responsavelEmail, responsavelPerfil,
      mercadoPagoPreferenceId, mercadoPagoPaymentId, ...result } = order;
    result.prazo = order.prazo ? localDate(order.prazo) : null;
    result.prazoIndefinido = order.prazoIndefinido === true;
    const params = [order.id];
    const ownerFilter = user?.perfil === 'DESENVOLVEDOR' ? ' and linked.responsavel_id=$2' : '';
    if (ownerFilter) params.push(user.id);
    result.ordensVinculadas = await this.db.query(`select linked.id,linked.codigo,linked.titulo,linked.status
      from ordens_servico_vinculos v join ordens_servico linked on linked.id=v.ordem_servico_vinculada_id
      where v.ordem_servico_id=$1${ownerFilter} order by linked.codigo`, params);
    result.transicoesStatus = [];
    if (transitions) {
      const config = await this.config();
      result.transicoesStatus = STATUSES.filter(status => status !== order.status).map(status => {
        let motivo: string | null = null;
        if (!(TRANSITIONS[order.status] || []).includes(status)) motivo = order.status === 'RECEBIDA'
          ? 'Este ticket precisa passar por analise antes.' : 'Esta etapa nao permite mover diretamente para o status selecionado.';
        else if (status === 'AGUARDANDO_APROVACAO' && config.exigirAprovacaoAdminAntesCliente && user?.perfil === 'DESENVOLVEDOR') motivo = 'Aguardando aprovacao do administrador.';
        else if (status === 'AGUARDANDO_APROVACAO' && config.exigirAnaliseAntesCliente && (!OPTIONAL(order.entendimento) || order.estimativaHoras == null)) motivo = 'Este ticket precisa ter a analise preenchida antes.';
        return { status, permitida: !motivo, motivoBloqueio: motivo };
      });
    }
    return result;
  }

  async find(id: string, user?: any) { return this.response(await this.assertAccess(id, user), user, true); }
  async list(user?: any) {
    const orders = await this.db.query(ORDER_SELECT + (user?.perfil === 'DESENVOLVEDOR' ? ' where o.responsavel_id=$1' : '') + ' order by o.atualizado_em desc', user?.perfil === 'DESENVOLVEDOR' ? [user.id] : []);
    return Promise.all(orders.map(order => this.response(order, user, true)));
  }
  async forClient(clienteId: string) {
    const orders = await this.db.query(ORDER_SELECT + ' where o.cliente_id=$1 order by o.atualizado_em desc', [clienteId]);
    return Promise.all(orders.map(order => this.response(order)));
  }
  async config() {
    return await this.db.one('select * from configuracoes_os limit 1') || {
      prioridadePadrao: 'MEDIA', permitirSemResponsavel: true, statusInicial: 'RECEBIDA',
      exigirAnaliseAntesCliente: false, exigirAprovacaoAdminAntesCliente: true,
      prazoBaixaDias: 10, prazoMediaDias: 5, prazoAltaDias: 2, prazoCriticaDias: 1,
    };
  }
  async dueDate(priority: string, config?: any) {
    const c = config || await this.config();
    const days = { BAIXA: c.prazoBaixaDias, MEDIA: c.prazoMediaDias, ALTA: c.prazoAltaDias, CRITICA: c.prazoCriticaDias }[priority];
    if (!PRIORITIES.includes(priority)) throw new UnprocessableEntityException('Prioridade invalida.');
    const date = new Date(localDate() + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + Number(days));
    return date.toISOString().slice(0, 10);
  }
  async entity(table: 'clientes' | 'usuarios' | 'projetos', id: string) {
    const value = await this.db.one(`select * from ${table} where id=$1`, [id]);
    if (!value) throw new NotFoundException(`${{ clientes: 'Cliente', usuarios: 'Usuario', projetos: 'Projeto' }[table]} nao encontrado.`);
    return value;
  }
  private async validateProject(id: string | undefined, clienteId: string) {
    if (!id) return;
    const project = await this.entity('projetos', id);
    if (project.clienteId && project.clienteId !== clienteId) throw new UnprocessableEntityException('Projeto nao pertence ao cliente informado.');
  }
  private amount(estimate: any, hour: any, charge = true) {
    if (!charge) return '0.00';
    if (estimate == null || hour == null) return null;
    // BigDecimal -> PostgreSQL numeric(12,2) uses decimal arithmetic and half-up
    // rounding. Binary floating point toFixed can round 0.15 * 0.1 incorrectly.
    const decimal = (value: any) => {
      const parts = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(value));
      if (!parts) throw new UnprocessableEntityException('Valor monetario invalido.');
      let scale = (parts[3] || '').length - Number(parts[4] || 0);
      let units = BigInt(parts[2] + (parts[3] || '')) * (parts[1] === '-' ? -1n : 1n);
      if (scale < 0) { units *= 10n ** BigInt(-scale); scale = 0; }
      return { units, scale };
    };
    const a = decimal(estimate), b = decimal(hour), product = a.units * b.units;
    const scale = a.scale + b.scale;
    let cents = product < 0n ? -product : product;
    if (scale > 2) {
      const divisor = 10n ** BigInt(scale - 2);
      cents = cents / divisor + ((cents % divisor) * 2n >= divisor ? 1n : 0n);
    } else cents *= 10n ** BigInt(2 - scale);
    return `${product < 0n ? '-' : ''}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
  }
  async change(id: string, values: any) { return this.db.update('ordens_servico', id, { ...values, atualizadoEm: new Date() }); }

  async create(body: any, user?: any) {
    return this.db.transaction(async () => {
      const config = await this.config();
      const client = await this.entity('clientes', body.clienteId);
      const ownerId = body.responsavelId || config.responsavelPadraoId || null;
      if (ownerId) await this.entity('usuarios', ownerId);
      if (!ownerId && !config.permitirSemResponsavel) throw new UnprocessableEntityException('Informe um responsavel para o ticket.');
      const priority = body.prioridade || config.prioridadePadrao;
      await this.validateProject(body.projetoId, client.id);
      const links: string[] = [...new Set<string>(body.ordemServicoIds || [])];
      if (links.length) {
        const found = await this.db.query('select id from ordens_servico where id=any($1::uuid[])', [links]);
        if (found.length !== links.length) throw new NotFoundException('Um ou mais tickets relacionados não foram encontrados.');
      }
      const code = await this.db.one("select nextval('ordens_servico_codigo_seq') as codigo");
      const id = uuid();
      const now = new Date();
      await this.db.insert('ordens_servico', {
        id, codigo: code!.codigo, titulo: body.titulo, descricao: body.descricao,
        clienteId: client.id, responsavelId: ownerId, projetoId: body.projetoId || null,
        status: config.statusInicial, prioridade: priority,
        prazo: body.prazoIndefinido ? null : body.prazo || await this.dueDate(priority, config),
        prazoIndefinido: body.prazoIndefinido === true, estimativaHoras: body.estimativaHoras ?? null,
        cobrar: true, paga: false, valorTotalEstimado: this.amount(body.estimativaHoras, client.valorHora), criadoEm: now, atualizadoEm: now,
      });
      for (const linked of links) await this.linkPair(id, linked);
      await audit(this.db, id, ownerId, 'CRIACAO', 'Ticket criada.', null, config.statusInicial);
      if (links.length) await audit(this.db, id, ownerId, 'VINCULOS', 'Tickets relacionados adicionados durante o cadastro.', null, config.statusInicial);
      const order = await this.assertAccess(id);
      if (!ownerId) await this.notify(order, 'OS_SEM_RESPONSAVEL', 'Ticket criado sem responsavel', `O ticket ${order.codigo} foi criada sem responsavel.`);
      if (!order.prazo) await this.notify(order, 'OS_SEM_PRAZO', 'Ticket criado sem prazo', `O ticket ${order.codigo} foi criada sem prazo definido.`);
      if (priority === 'CRITICA') await this.critical(order);
      await this.assignment(order, `Uma novo ticket foi atribuida a voce: ${order.codigo} - ${order.titulo}.`);
      return this.response(order);
    });
  }

  async update(id: string, body: any, user?: any) {
    return this.db.transaction(async () => {
      const old = await this.assertAccess(id, user);
      const client = await this.entity('clientes', body.clienteId);
      if (body.responsavelId) await this.entity('usuarios', body.responsavelId);
      if (!body.responsavelId && !(await this.config()).permitirSemResponsavel) throw new UnprocessableEntityException('A configuração atual não permite ticket sem responsável.');
      await this.validateProject(body.projetoId, client.id);
      await this.change(id, {
        titulo: body.titulo, descricao: body.descricao, clienteId: client.id,
        responsavelId: body.responsavelId || null, projetoId: body.projetoId || null,
        prioridade: body.prioridade, prazo: body.prazoIndefinido ? null : body.prazo || await this.dueDate(body.prioridade),
        prazoIndefinido: body.prazoIndefinido === true, entendimento: body.entendimento ?? null,
        impacto: body.impacto ?? null, riscos: body.riscos ?? null, estimativaHoras: body.estimativaHoras ?? null,
        valorTotalEstimado: this.amount(body.estimativaHoras, client.valorHora, old.cobrar),
        ...(old.responsavelId !== (body.responsavelId || null) ? { sequenciaExecucao: null } : {}),
      });
      const order = await this.assertAccess(id);
      if (old.responsavelId !== order.responsavelId) {
        await this.ownerChanged(order, old.responsavelNome);
        if (order.responsavelId) await this.assignment(order, `O ticket ${order.codigo} foi direcionada para voce.`);
      }
      if (old.prioridade !== order.prioridade) await this.priorityChanged(order);
      if (localDate(old.prazo || '') !== localDate(order.prazo || '')) await this.deadlineChanged(order);
      return this.response(order);
    });
  }

  async remove(id: string, user?: any) {
    await this.assertAccess(id, user);
    await this.db.query('delete from ordens_servico where id=$1', [id]);
  }

  async transition(id: string, body: any, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      const config = await this.config();
      let destination = body.status;
      const payment = await this.db.one('select * from configuracoes_pagamento limit 1');
      if (body.status === 'FINALIZADA' && order.status === 'EM_TESTE' && order.cobrar && !order.paga && payment?.cobrarAutomaticamenteOsFinalizada) destination = 'AGUARDANDO_PAGAMENTO';
      if (body.status === 'AGUARDANDO_APROVACAO' && config.exigirAprovacaoAdminAntesCliente && user?.perfil === 'DESENVOLVEDOR') throw new UnprocessableEntityException('A analise deve ser aprovada por um administrador antes de avancar o ticket.');
      if (body.status === 'AGUARDANDO_APROVACAO' && config.exigirAnaliseAntesCliente) this.validateAnalysis(order);
      if (destination !== order.status && !(TRANSITIONS[order.status] || []).includes(destination)) throw new UnprocessableEntityException(`Transicao de status invalida: ${order.status} para ${destination}.`);
      const values: any = { status: destination, finalizadoEm: null, descricaoFinalizacao: null, commitsFinalizacao: null, branchFinalizacao: null, arquivosAlteradosFinalizacao: null };
      if (destination === 'FINALIZADA') {
        if (!OPTIONAL(body.descricao)) throw new UnprocessableEntityException('Informe o que foi feito antes de finalizar o ticket.');
        Object.assign(values, { finalizadoEm: new Date(), descricaoFinalizacao: body.descricao.trim(), commitsFinalizacao: OPTIONAL(body.commitsFinalizacao), branchFinalizacao: OPTIONAL(body.branchFinalizacao), arquivosAlteradosFinalizacao: OPTIONAL(body.arquivosAlteradosFinalizacao) });
      }
      await this.change(id, values);
      await audit(this.db, id, user?.id || null, 'ALTERACAO_STATUS', body.descricao ?? 'Status do ticket alterado.', order.status, destination);
      const saved = await this.assertAccess(id);
      await this.statusChanged(saved);
      if (destination === 'FINALIZADA') await this.integrations.notifyOrder(saved, 'finalizada');
      return this.response(saved);
    });
  }

  async reopen(id: string, body: any, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      if (order.status !== 'FINALIZADA') throw new UnprocessableEntityException('Somente um ticket finalizado pode ser reaberto.');
      const reason = OPTIONAL(body.motivo);
      if (!reason) throw new UnprocessableEntityException('O motivo da reabertura e obrigatorio.');
      await this.change(id, { status: 'EM_DESENVOLVIMENTO' });
      await audit(this.db, id, user?.id, 'REABERTURA', `Ticket reaberto. Motivo: ${reason}`, 'FINALIZADA', 'EM_DESENVOLVIMENTO');
      await this.notify(order, 'REABERTURA', 'Ticket reaberto', `O ticket ${order.codigo} foi reaberto. Motivo: ${reason}`);
      return this.response(await this.assertAccess(id));
    });
  }

  async cancel(id: string, body: any, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      if (order.status === 'FINALIZADA') throw new UnprocessableEntityException('Um ticket finalizado não pode ser cancelado.');
      if (order.status === 'CANCELADA') throw new UnprocessableEntityException('O ticket já está cancelado.');
      const reason = OPTIONAL(body.motivo);
      if (!reason) throw new UnprocessableEntityException('Informe o motivo do cancelamento.');
      await this.change(id, { status: 'CANCELADA', sequenciaExecucao: null });
      await audit(this.db, id, user?.id, 'CANCELAMENTO', `Ticket cancelado. Motivo: ${reason}`, order.status, 'CANCELADA');
      const saved = await this.assertAccess(id);
      await this.statusChanged(saved);
      return this.response(saved);
    });
  }

  validateAnalysis(order: any) {
    if (!OPTIONAL(order.entendimento) || order.estimativaHoras == null) throw new UnprocessableEntityException('Preencha o texto da análise e a estimativa antes de enviar ao cliente.');
  }
  async analysis(id: string, body: any, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      const starting = order.status === 'RECEBIDA';
      if (!starting && order.status !== 'EM_ANALISE') throw new UnprocessableEntityException('A analise so pode ser alterada em tickets recebidos ou em analise.');
      const dev = user?.perfil === 'DESENVOLVEDOR';
      const values: any = { estimativaHoras: body.estimativaHoras ?? null };
      if (!dev) {
        Object.assign(values, { entendimento: body.entendimento ?? null, impacto: body.impacto ?? null, riscos: body.riscos ?? null, cobrar: body.cobrar ?? true });
        if (!values.cobrar && !(await this.db.one('select * from configuracoes_pagamento limit 1'))?.permitirOsSemCobranca) throw new UnprocessableEntityException('A configuracao atual nao permite ticket sem cobranca.');
      }
      const candidate = { ...order, ...values };
      const send = !dev || (!(await this.config()).exigirAprovacaoAdminAntesCliente && !!OPTIONAL(candidate.entendimento) && candidate.estimativaHoras != null);
      if (send) this.validateAnalysis(candidate);
      values.status = send ? 'AGUARDANDO_APROVACAO' : 'EM_ANALISE';
      values.valorTotalEstimado = this.amount(candidate.estimativaHoras, candidate.clienteValorHora, candidate.cobrar);
      await this.change(id, values);
      if (starting) await audit(this.db, id, order.responsavelId, 'ALTERACAO_STATUS', 'Análise iniciada ao salvar as primeiras informações.', 'RECEBIDA', 'EM_ANALISE');
      await audit(this.db, id, order.responsavelId, 'ANALISE', dev ? 'Estimativa de horas informada pelo desenvolvedor.' : 'Análise técnica concluída.', null, values.status);
      const saved = await this.assertAccess(id);
      if (send) {
        await audit(this.db, id, order.responsavelId, 'ALTERACAO_STATUS', 'Análise concluída e enviada automaticamente para aprovação.', 'EM_ANALISE', 'AGUARDANDO_APROVACAO');
        await this.statusChanged(saved);
        await this.integrations.notifyOrder(saved, 'analisada');
      } else if (starting) await this.statusChanged(saved);
      return this.response(saved);
    });
  }

  async approval(id: string, approved: boolean, observation?: string, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      if (order.status !== 'AGUARDANDO_APROVACAO') throw new UnprocessableEntityException('Ticket nao esta aguardando aprovacao do cliente.');
      const status = approved ? 'APROVADA' : 'EM_ANALISE';
      await this.change(id, { aprovadaPeloCliente: approved, aprovadoPeloClienteEm: new Date(), observacaoAprovacaoCliente: observation ?? null, status });
      await audit(this.db, id, order.responsavelId, approved ? 'APROVACAO_CLIENTE' : 'REPROVACAO_CLIENTE', approved ? 'Ticket aprovado pelo cliente.' : 'Ticket reprovado pelo cliente.', 'AGUARDANDO_APROVACAO', status);
      const title = approved ? 'Ticket aprovado pelo cliente' : 'Ticket reprovado pelo cliente';
      const message = approved ? `O cliente aprovou o ticket ${order.codigo}.` : `O cliente reprovou o ticket ${order.codigo} e ela voltou para analise.`;
      await this.notify(order, 'APROVACAO_CLIENTE', title, message);
      if (order.responsavelPerfil === 'DESENVOLVEDOR') await this.notifications.notify('APROVACAO_CLIENTE', title, message, { orderId: id, userIds: [order.responsavelId] });
      return this.response(await this.assertAccess(id));
    });
  }

  async owner(id: string, ownerId: string, user?: any) {
    return this.db.transaction(async () => {
      const old = await this.assertAccess(id, user);
      await this.entity('usuarios', ownerId);
      await this.change(id, { responsavelId: ownerId, sequenciaExecucao: null });
      await audit(this.db, id, ownerId, 'RESPONSAVEL', 'Responsável do ticket atualizado.', null, old.status);
      const order = await this.assertAccess(id);
      await this.ownerChanged(order, old.responsavelNome);
      await this.assignment(order, `O ticket ${order.codigo} foi direcionada para voce.`);
      return this.response(order);
    });
  }

  async assume(id: string, user: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      if (order.responsavelId) throw new UnprocessableEntityException('Este ticket ja possui responsavel.');
      await this.change(id, { responsavelId: user.id, sequenciaExecucao: null });
      await audit(this.db, id, user.id, 'RESPONSAVEL', 'Ticket assumida pelo usuario autenticado.', null, order.status);
      const saved = await this.assertAccess(id);
      await this.assignment(saved, 'Voce assumiu o ticket.');
      return this.response(saved);
    });
  }

  async priority(id: string, priority: string, user?: any) {
    return this.db.transaction(async () => {
      const old = await this.assertAccess(id, user);
      const values: any = { prioridade: priority };
      if (!old.prazoIndefinido && !old.prazo && old.prioridade !== priority) values.prazo = await this.dueDate(priority);
      await this.change(id, values);
      const order = await this.assertAccess(id);
      if (old.prioridade !== priority) await this.priorityChanged(order);
      return this.response(order);
    });
  }

  async sequence(id: string, position: number, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      if (!order.responsavelId || order.status === 'FINALIZADA') throw new UnprocessableEntityException('Somente tickets abertos e atribuidas podem ser reordenadas.');
      const queue = await this.db.query(ORDER_SELECT + " where o.responsavel_id=$1 and o.status not in ('FINALIZADA','CANCELADA') order by o.sequencia_execucao asc nulls last,o.atualizado_em desc,o.codigo desc", [order.responsavelId]);
      const index = queue.findIndex(row => row.id === id);
      if (index < 0) throw new UnprocessableEntityException('O ticket nao pertence a fila informada.');
      if (position < 1 || position > queue.length) throw new UnprocessableEntityException(`A posicao deve estar entre 1 e ${queue.length}.`);
      queue.splice(index, 1); queue.splice(position - 1, 0, order);
      for (let i = 0; i < queue.length; i++) { await this.change(queue[i].id, { sequenciaExecucao: i + 1 }); queue[i].sequenciaExecucao = i + 1; }
      return Promise.all(queue.map(row => this.response(row)));
    });
  }

  async paid(id: string, paid: boolean, user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      await this.change(id, { paga: paid });
      await audit(this.db, id, order.responsavelId, 'PAGAMENTO', paid ? 'Ticket marcada como paga.' : 'Ticket marcada como nao paga.', null, order.status);
      await this.notify(order, 'PAGAMENTO', paid ? 'Pagamento confirmado' : 'Pagamento removido', paid ? `O ticket ${order.codigo} foi marcada como paga.` : `O ticket ${order.codigo} voltou a constar como pendente.`);
      return this.response(await this.assertAccess(id));
    });
  }

  private async linkPair(id: string, linked: string) {
    await this.db.query('insert into ordens_servico_vinculos(ordem_servico_id,ordem_servico_vinculada_id) values($1,$2),($2,$1) on conflict do nothing', [id, linked]);
  }
  async links(id: string, ids: string[], user?: any) {
    return this.db.transaction(async () => {
      const order = await this.assertAccess(id, user);
      if (ids.includes(id)) throw new UnprocessableEntityException('Umo ticket nao pode ser vinculada a ela mesma.');
      const unique = [...new Set(ids)];
      const found = await this.db.query('select id from ordens_servico where id=any($1::uuid[])', [unique]);
      if (found.length !== unique.length) throw new NotFoundException('Uma ou mais tickets vinculados nao foram encontradas.');
      await this.db.query('delete from ordens_servico_vinculos where ordem_servico_id=$1 or ordem_servico_vinculada_id=$1', [id]);
      for (const linked of unique) await this.linkPair(id, linked);
      await this.change(id, {});
      await audit(this.db, id, order.responsavelId, 'VINCULOS', 'Vinculos entre tickets atualizados.', null, order.status);
      return this.response(await this.assertAccess(id));
    });
  }

  async pending() {
    const today = localDate();
    const rows = await this.db.query(ORDER_SELECT + ' order by o.prazo asc nulls last,o.codigo');
    const active = (row: any) => !['FINALIZADA', 'CANCELADA'].includes(row.status);
    const filters: Record<string, (row: any) => boolean> = {
      vencidas: row => active(row) && !!row.prazo && localDate(row.prazo) < today,
      vencemHoje: row => active(row) && !!row.prazo && localDate(row.prazo) === today,
      semResponsavel: row => active(row) && !row.responsavelId,
      aguardandoAprovacaoAdmin: row => row.status === 'RECEBIDA',
      aguardandoCliente: row => row.status === 'AGUARDANDO_APROVACAO',
      aguardandoPagamento: row => row.status === 'AGUARDANDO_PAGAMENTO' && !row.paga,
      reprovadasPeloCliente: row => row.aprovadaPeloCliente === false,
    };
    const result: any = {};
    for (const [key, filter] of Object.entries(filters)) result[key] = await Promise.all(rows.filter(filter).map(row => this.response(row)));
    return result;
  }

  async notify(order: any, type: string, title: string, message: string) { await this.notifications.notify(type, title, message, { orderId: order.id }); }
  async statusChanged(order: any) { await this.notify(order, 'STATUS', 'Status do ticket atualizado', `O ticket ${order.codigo} agora esta em ${order.status}.`); }
  private async critical(order: any) { await this.notify(order, 'OS_CRITICA', 'Ticket critico', `O ticket ${order.codigo} esta com prioridade critica.`); }
  private async assignment(order: any, message: string) {
    await this.notify(order, 'ATRIBUICAO', 'Ticket atribuido', `O ticket ${order.codigo} foi atribuida para ${order.responsavelNome || 'um responsavel'}.`);
    if (order.responsavelPerfil === 'DESENVOLVEDOR') await this.notifications.notify('ATRIBUICAO', 'Ticket atribuido a voce', message, { orderId: order.id, userIds: [order.responsavelId], deduplicate: true });
  }
  private async ownerChanged(order: any, previous: string) { await this.notify(order, 'RESPONSAVEL_ALTERADO', 'Responsável do ticket alterado', `O ticket ${order.codigo} mudou de ${previous || 'sem responsavel'} para ${order.responsavelNome || 'sem responsavel'}.`); }
  private async priorityChanged(order: any) {
    await this.notify(order, 'PRIORIDADE', 'Prioridade do ticket alterada', `O ticket ${order.codigo} agora esta com prioridade ${order.prioridade}.`);
    if (order.prioridade === 'CRITICA') await this.critical(order);
  }
  private async deadlineChanged(order: any) {
    const message = order.prazo ? `O ticket ${order.codigo} agora tem prazo em ${localDate(order.prazo)}.` : `O ticket ${order.codigo} ficou sem prazo definido.`;
    await this.notify(order, 'PRAZO_ALTERADO', 'Prazo do ticket alterado', message);
    if (!order.prazo) await this.notify(order, 'OS_SEM_PRAZO', 'Ticket sem prazo', message);
  }
}
