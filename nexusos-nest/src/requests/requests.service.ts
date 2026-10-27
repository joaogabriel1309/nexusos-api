import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { mkdir, readFile, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { Db } from '../common/db';
import { uuid } from '../common/helpers';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderFilesService } from '../orders/order-files.service';
import { OrdersService } from '../orders/orders.service';
import { ConvertRequestDto, PRIORITIES, REJECTION_REASONS, RejectRequestDto } from './requests.dto';

const SELECT_REQUEST = `select s.*, c.nome cliente_nome, u.nome responsavel_nome,
  o.codigo ticket_codigo from solicitacoes s join clientes c on c.id=s.cliente_id
  left join usuarios u on u.id=s.responsavel_id
  left join ordens_servico o on o.id=s.ordem_servico_id`;

@Injectable()
export class RequestsService {
  constructor(
    private readonly db: Db,
    private readonly orders: OrdersService,
    private readonly files: OrderFilesService,
    private readonly notifications: NotificationsService,
  ) {}

  async client(token: string) {
    if (!/^[A-Za-z0-9_-]{64}$/.test(token || '')) throw new NotFoundException('Link de acesso invalido.');
    const client = await this.db.one(`select * from clientes where token_acesso=$1 and ativo=true
      and token_acesso_expira_em > now()`, [token]);
    if (!client) throw new NotFoundException('Link de acesso invalido.');
    return client;
  }

  async list() {
    return (await this.db.query(`${SELECT_REQUEST} order by s.atualizado_em desc`)).map(row => this.summary(row));
  }

  async counts() {
    const row = await this.db.one(`select count(*)::int pendentes from solicitacoes where status in ('NOVA','EM_ANALISE')`);
    return { pendentes: Number(row?.pendentes || 0) };
  }

  async entity(id: string, lock = false) {
    const row = await this.db.one(`${SELECT_REQUEST} where s.id=$1${lock ? ' for update of s' : ''}`, [id]);
    if (!row) throw new NotFoundException('Solicitacao nao encontrada.');
    return row;
  }

  async listPortal(token: string) {
    const client = await this.client(token);
    return (await this.db.query(`${SELECT_REQUEST} where s.cliente_id=$1 order by s.atualizado_em desc`, [client.id]))
      .map(row => this.summary(row));
  }

  async authorized(token: string, id: string, lock = false) {
    const client = await this.client(token);
    const row = await this.db.one(`${SELECT_REQUEST} where s.id=$1 and s.cliente_id=$2${lock ? ' for update of s' : ''}`, [id, client.id]);
    if (!row) throw new NotFoundException('Solicitacao nao encontrada para este cliente.');
    return row;
  }

  async find(id: string) { return this.detail(await this.entity(id), true); }

  async findPortal(token: string, id: string) {
    return this.detail(await this.authorized(token, id), false);
  }

  async createPortal(token: string, body: { titulo: string; descricao: string; prioridade?: string }, files?: Express.Multer.File[]) {
    return this.db.transaction(async () => {
      const client = await this.client(token);
      const titulo = this.text(body.titulo, 180, 'Informe um assunto com ate 180 caracteres.');
      const descricao = this.text(body.descricao, 10000, 'Informe uma descricao com ate 10000 caracteres.');
      this.priority(body.prioridade);
      if (body.prioridade === 'CRITICA') throw new UnprocessableEntityException('A urgencia critica e definida pela equipe durante a analise.');
      const code = await this.db.one(`select nextval('solicitacoes_codigo_seq') codigo`);
      const now = new Date();
      const request = await this.db.insert('solicitacoes', {
        id: uuid(), codigo: code!.codigo, titulo, descricao, clienteId: client.id,
        prioridade: body.prioridade || null, status: 'NOVA', criadoEm: now, atualizadoEm: now,
      });
      await this.interact(request.id, null, 'SISTEMA', 'Solicitacao recebida. A equipe fara a triagem em breve.');
      await this.saveFiles(request.id, null, files);
      await this.audit(request.id, null, 'CLIENTE', 'CRIACAO', 'Solicitacao criada pelo Portal do Cliente.', null, 'NOVA');
      await this.notifications.notify('SOLICITACAO_NOVA', 'Nova solicitacao recebida',
        `A solicitacao SOL-${String(request.codigo).padStart(6, '0')} foi enviada por ${client.nome}.`, { requestId: request.id });
      return this.detail(await this.entity(request.id), false);
    });
  }

  async claim(id: string, user: any) {
    return this.db.transaction(async () => {
      const request = await this.entity(id, true);
      this.open(request);
      const status = request.status === 'NOVA' ? 'EM_ANALISE' : request.status;
      if (request.status === 'NOVA') await this.interact(id, user.id, 'SISTEMA', 'A equipe iniciou a analise da solicitacao.');
      await this.update(id, { responsavelId: user.id, status });
      await this.audit(id, user.id, 'EQUIPE', 'ATRIBUICAO', `Solicitacao assumida por ${user.nome}.`, request.status, status);
      return this.find(id);
    });
  }

  async owner(id: string, responsavelId: string | null | undefined, user: any) {
    return this.db.transaction(async () => {
      const request = await this.entity(id, true);
      this.open(request);
      let owner: any = null;
      if (responsavelId) {
        owner = await this.db.one('select * from usuarios where id=$1', [responsavelId]);
        if (!owner) throw new NotFoundException('Usuario nao encontrado.');
        if (owner.perfil !== 'ADMIN') throw new UnprocessableEntityException('A triagem deve ser atribuida a um administrador.');
      }
      const status = owner && request.status === 'NOVA' ? 'EM_ANALISE' : request.status;
      if (owner && request.status === 'NOVA') await this.interact(id, user.id, 'SISTEMA', 'A equipe iniciou a analise da solicitacao.');
      await this.update(id, { responsavelId: owner?.id || null, status });
      await this.audit(id, user.id, 'EQUIPE', 'RESPONSAVEL', owner ? `Responsavel definido: ${owner.nome}.` : 'Responsavel removido.', request.status, status);
      return this.find(id);
    });
  }

  async clarify(id: string, mensagem: string, user: any) {
    return this.db.transaction(async () => {
      const request = await this.entity(id, true);
      this.open(request);
      await this.interact(id, user.id, 'EQUIPE', this.message(mensagem));
      await this.update(id, { responsavelId: request.responsavelId || user.id, status: 'AGUARDANDO_CLIENTE' });
      await this.audit(id, user.id, 'EQUIPE', 'ESCLARECIMENTO', 'A equipe solicitou esclarecimentos ao cliente.', request.status, 'AGUARDANDO_CLIENTE');
      return this.find(id);
    });
  }

  async replyPortal(token: string, id: string, mensagem: string, files?: Express.Multer.File[]) {
    return this.db.transaction(async () => {
      const request = await this.authorized(token, id, true);
      this.open(request);
      const interaction = await this.interact(id, null, 'CLIENTE', this.message(mensagem));
      await this.saveFiles(id, interaction.id, files);
      const status = request.status === 'AGUARDANDO_CLIENTE' ? 'EM_ANALISE' : request.status;
      await this.update(id, { status });
      await this.audit(id, null, 'CLIENTE', 'RESPOSTA_CLIENTE', 'Cliente respondeu pela conversa da solicitacao.', request.status, status);
      await this.notifications.notify('SOLICITACAO_RESPOSTA', 'Cliente respondeu a solicitacao',
        `A solicitacao SOL-${String(request.codigo).padStart(6, '0')} voltou para analise.`, { requestId: id });
      return this.detail(await this.entity(id), false);
    });
  }

  async reject(id: string, body: RejectRequestDto, user: any) {
    return this.db.transaction(async () => {
      const request = await this.entity(id, true);
      this.open(request);
      if (!REJECTION_REASONS.includes(body.motivo)) throw new BadRequestException('Informe um motivo de rejeicao valido.');
      const detail = this.text(body.detalhe, 2000, 'Informe o motivo da rejeicao com ate 2000 caracteres.');
      await this.update(id, { status: 'REJEITADA', motivoRejeicao: body.motivo, detalheRejeicao: detail });
      await this.interact(id, user.id, 'SISTEMA', `Solicitacao encerrada. Motivo: ${detail}`);
      await this.audit(id, user.id, 'EQUIPE', 'REJEICAO', `Solicitacao rejeitada: ${body.motivo}.`, request.status, 'REJEITADA');
      return this.find(id);
    });
  }

  async convert(id: string, body: ConvertRequestDto, user: any) {
    return this.db.transaction(async () => {
      const request = await this.entity(id, true);
      if (request.status === 'CONVERTIDA_EM_TICKET' && request.ordemServicoId) return this.find(id);
      this.open(request);
      this.priority(body.prioridade);
      const ticket = await this.orders.create({
        titulo: this.text(body.titulo, 180, 'Informe um assunto com ate 180 caracteres.'),
        descricao: this.text(body.descricao, 10000, 'Informe uma descricao com ate 10000 caracteres.'),
        clienteId: request.clienteId, responsavelId: body.responsavelId, projetoId: body.projetoId,
        prioridade: body.prioridade || request.prioridade, prazo: body.prazo,
        prazoIndefinido: body.prazoIndefinido || false, ordemServicoIds: [],
      }, user);
      const attachments = await this.db.query('select * from solicitacao_anexos where solicitacao_id=$1 order by criado_em', [id]);
      for (const file of attachments) await this.files.copyExisting(ticket.id, file.caminho, file.nomeArquivo, file.tipoArquivo, Number(file.tamanho), file.enviadoPeloCliente, user);
      await this.update(id, { ordemServicoId: ticket.id, status: 'CONVERTIDA_EM_TICKET' });
      await this.interact(id, user.id, 'SISTEMA', `Solicitacao aprovada e transformada no Ticket #${ticket.codigo}.`);
      await this.audit(id, user.id, 'EQUIPE', 'CONVERSAO', `Solicitacao convertida no Ticket #${ticket.codigo}.`, request.status, 'CONVERTIDA_EM_TICKET');
      return this.find(id);
    });
  }

  async download(id: string, attachmentId: string) {
    const file = await this.db.one('select * from solicitacao_anexos where id=$1 and solicitacao_id=$2', [attachmentId, id]);
    if (!file) throw new NotFoundException('Anexo nao encontrado.');
    const path = this.safePath(file.caminho);
    try {
      const real = await realpath(path);
      this.within(await realpath(resolve(process.env.UPLOADS_PATH || '../uploads')), real);
      if (!(await stat(real)).isFile()) throw new Error();
      return { buffer: await readFile(real), nomeArquivo: file.nomeArquivo, tipoArquivo: file.tipoArquivo };
    } catch {
      throw new UnprocessableEntityException('Arquivo do anexo nao encontrado.');
    }
  }

  private async detail(row: any, includeAudit: boolean) {
    const interactions = await this.db.query(`select i.id, i.origem, i.mensagem, i.criado_em,
      case when i.origem='CLIENTE' then c.nome when i.origem='EQUIPE' then coalesce(u.nome,'Equipe')
      else 'Sistema' end autor_nome from solicitacao_interacoes i
      join solicitacoes s on s.id=i.solicitacao_id join clientes c on c.id=s.cliente_id
      left join usuarios u on u.id=i.usuario_id where i.solicitacao_id=$1 order by i.criado_em asc`, [row.id]);
    const attachments = await this.db.query(`select id, interacao_id, nome_arquivo, tipo_arquivo, tamanho,
      enviado_pelo_cliente, criado_em from solicitacao_anexos where solicitacao_id=$1 order by criado_em asc`, [row.id]);
    const audit = includeAudit ? await this.db.query(`select a.id, a.usuario_id, u.nome usuario_nome, a.origem,
      a.tipo_evento, a.descricao, a.status_anterior, a.status_novo, a.criado_em from auditoria_solicitacoes a
      left join usuarios u on u.id=a.usuario_id where a.solicitacao_id=$1 order by a.criado_em desc`, [row.id]) : [];
    return { solicitacao: this.summary(row), motivoRejeicao: row.motivoRejeicao ?? null,
      detalheRejeicao: row.detalheRejeicao ?? null, interacoes: interactions,
      anexos: attachments.map(file => ({ ...file, tamanho: Number(file.tamanho) })), auditoria: audit };
  }

  private summary(row: any) {
    return { id: row.id, codigo: Number(row.codigo), titulo: row.titulo, descricao: row.descricao,
      clienteId: row.clienteId, clienteNome: row.clienteNome, responsavelId: row.responsavelId ?? null,
      responsavelNome: row.responsavelNome ?? null, prioridade: row.prioridade ?? null, status: row.status,
      ticketId: row.ordemServicoId ?? null, ticketCodigo: row.ticketCodigo == null ? null : Number(row.ticketCodigo),
      criadoEm: row.criadoEm, atualizadoEm: row.atualizadoEm };
  }

  private async interact(id: string, userId: string | null, origem: string, mensagem: string) {
    await this.update(id, {});
    return this.db.insert('solicitacao_interacoes', { id: uuid(), solicitacaoId: id, usuarioId: userId, origem, mensagem, criadoEm: new Date() });
  }

  private async update(id: string, data: any) {
    await this.db.query('update solicitacoes set versao=versao+1 where id=$1', [id]);
    return this.db.update('solicitacoes', id, { ...data, atualizadoEm: new Date() });
  }

  private audit(id: string, userId: string | null, origem: string, tipoEvento: string, descricao: string, statusAnterior: string | null, statusNovo: string) {
    return this.db.insert('auditoria_solicitacoes', { id: uuid(), solicitacaoId: id, usuarioId: userId, origem, tipoEvento, descricao, statusAnterior, statusNovo, criadoEm: new Date() });
  }

  private async saveFiles(id: string, interactionId: string | null, received?: Express.Multer.File[]) {
    const files = (received || []).filter(file => file && file.size > 0);
    if (files.length > 5) throw new UnprocessableEntityException('Envie no maximo 5 anexos por vez.');
    const count = await this.db.one('select count(*)::int total from solicitacao_anexos where solicitacao_id=$1', [id]);
    if (Number(count!.total) + files.length > 20) throw new UnprocessableEntityException('A solicitacao atingiu o limite de 20 anexos.');
    const names = files.map(file => this.files.validateUpload(file));
    if (!files.length) return;
    const directory = this.safePath(resolve(process.env.UPLOADS_PATH || '../uploads', 'solicitacoes', id));
    await mkdir(directory, { recursive: true });
    this.within(await realpath(resolve(process.env.UPLOADS_PATH || '../uploads')), await realpath(directory));
    const created: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = this.safePath(resolve(directory, `${uuid()}-${names[i]}`));
        await writeFile(path, file.buffer, { flag: 'wx' });
        created.push(path);
        await this.db.insert('solicitacao_anexos', { id: uuid(), solicitacaoId: id, interacaoId: interactionId,
          nomeArquivo: names[i], tipoArquivo: file.mimetype || 'application/octet-stream', tamanho: file.size,
          caminho: path, enviadoPeloCliente: true, criadoEm: new Date() });
      }
    } catch (error) {
      await Promise.allSettled(created.map(path => unlink(path)));
      throw error;
    }
  }

  private safePath(path: string) {
    const base = resolve(process.env.UPLOADS_PATH || '../uploads');
    const full = resolve(path);
    this.within(base, full);
    return full;
  }

  private within(base: string, full: string) {
    const rel = relative(base, full);
    if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new UnprocessableEntityException('Caminho de upload invalido.');
  }

  private open(row: any) {
    if (['REJEITADA', 'CONVERTIDA_EM_TICKET'].includes(row.status)) throw new UnprocessableEntityException('Esta solicitacao ja foi encerrada.');
  }

  private text(value: string, max: number, message: string) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new UnprocessableEntityException(message);
    return value.trim();
  }

  private priority(value?: string) {
    if (value != null && !PRIORITIES.includes(value)) throw new BadRequestException('Prioridade invalida.');
  }

  private message(value: string) { return this.text(value, 5000, 'Informe uma mensagem com ate 5000 caracteres.'); }
}
