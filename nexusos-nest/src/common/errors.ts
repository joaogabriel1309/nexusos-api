import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
@Catch()
export class Errors implements ExceptionFilter {
  private readonly logger = new Logger('API');
  catch(error: any, host: ArgumentsHost) {
    const { getRequest, getResponse } = host.switchToHttp();
    const req = getRequest(), res = getResponse();
    let status = error instanceof HttpException ? error.getStatus() : 500;
    let mensagem: any = status === 500 ? 'Erro interno no servidor.' : error.message;
    let campos: any[] = [];
    if (error instanceof HttpException) { const body: any = error.getResponse(); if (body && typeof body === 'object') { mensagem = body.message || mensagem; campos = body.campos || []; } }
    if (Array.isArray(mensagem)) { campos = mensagem.map(m => typeof m === 'object' ? m : { campo: '', mensagem: m }); mensagem = 'Requisição inválida.'; }
    if (error.code === '23505') { status = 422; mensagem = 'Já existe um registro com os dados informados.'; }
    if (error.code === '23503') { status = 422; mensagem = 'O registro está vinculado a outro recurso ou o vínculo não existe.'; }
    if (['22P02','22007','22008','22003'].includes(error.code)) { status = 400; mensagem = 'Parâmetro em formato inválido.'; }
    if (status >= 500) this.logger.error(error.stack || error.message);
    if (!res.headersSent) res.status(status).json({ timestamp: new Date().toISOString(), status, erro: STATUS_CODES[status], mensagem, path: req.originalUrl.split('?')[0], campos });
  }
}
