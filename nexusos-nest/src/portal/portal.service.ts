import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Db } from '../common/db';
import { IntegrationsService } from '../integrations/integrations.service';
import { OrdersService } from '../orders/orders.service';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class PortalService {
  constructor(private readonly db: Db, private readonly requests: RequestsService,
    private readonly orders: OrdersService, private readonly integrations: IntegrationsService) {}

  async list(token: string) {
    const client = await this.requests.client(token);
    const orders = await this.db.query(`select o.*, p.nome projeto_nome from ordens_servico o
      left join projetos p on p.id=o.projeto_id where o.cliente_id=$1 order by o.atualizado_em desc`, [client.id]);
    return { clienteNome: client.nome, ordens: orders.map(row => this.response(row)) };
  }

  async authorized(token: string, id: string) {
    const client = await this.requests.client(token);
    const order = await this.db.one(`select o.*, p.nome projeto_nome from ordens_servico o
      left join projetos p on p.id=o.projeto_id where o.id=$1 and o.cliente_id=$2`, [id, client.id]);
    if (!order) throw new NotFoundException('Ticket não encontrado para este cliente.');
    return order;
  }

  async decision(token: string, id: string, approved: boolean, observation?: string) {
    if (observation != null && (typeof observation !== 'string' || observation.length > 2000)) throw new BadRequestException('O motivo deve ter no maximo 2000 caracteres.');
    if (!approved && !observation?.trim()) throw new UnprocessableEntityException('Informe o motivo da solicitacao de ajuste.');
    await this.authorized(token, id);
    await this.orders.approval(id, approved, approved ? observation : observation?.trim());
    return this.response(await this.authorized(token, id));
  }

  async checkout(token: string, id: string) { return this.integrations.checkout(await this.authorized(token, id), token); }
  async pix(token: string, id: string) { return this.integrations.pix(await this.authorized(token, id)); }

  async confirmPayment(token: string, id: string, paymentId: string) {
    if (typeof paymentId !== 'string' || !/^[A-Za-z0-9._-]{1,120}$/.test(paymentId)) throw new BadRequestException('Identificador de pagamento invalido.');
    await this.integrations.verifyPayment(await this.authorized(token, id), paymentId);
    return this.response(await this.authorized(token, id));
  }

  async verifyPayment(token: string, id: string) {
    await this.integrations.verifyPayment(await this.authorized(token, id));
    return this.response(await this.authorized(token, id));
  }

  response(order: any) {
    return { id: order.id, codigo: Number(order.codigo), titulo: order.titulo, descricao: order.descricao,
      status: order.status, prioridade: order.prioridade, projetoId: order.projetoId ?? null,
      projetoNome: order.projetoNome ?? null, textoAnalise: order.entendimento ?? null,
      valorTotalEstimado: order.valorTotalEstimado == null ? null : Number(order.valorTotalEstimado),
      pagamentoDisponivel: order.cobrar !== false, paga: order.paga ?? null,
      pagamentoIniciado: order.mercadoPagoPreferenceId != null, descricaoFinalizacao: order.descricaoFinalizacao ?? null,
      criadoEm: order.criadoEm, atualizadoEm: order.atualizadoEm, finalizadoEm: order.finalizadoEm ?? null,
      aprovadaPeloCliente: order.aprovadaPeloCliente ?? null, aprovadoPeloClienteEm: order.aprovadoPeloClienteEm ?? null,
      observacaoAprovacaoCliente: order.observacaoAprovacaoCliente ?? null };
  }
}
