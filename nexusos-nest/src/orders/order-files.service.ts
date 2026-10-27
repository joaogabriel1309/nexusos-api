import { BadRequestException, UnprocessableEntityException, Injectable, NotFoundException } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { Db } from '../common/db';
import { uploadsPath } from '../common/env';
import { uuid } from '../common/helpers';
import { OrdersService } from './orders.service';

const MIMES: Record<string, string[]> = {
  pdf: ['application/pdf'], png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'], txt: ['text/plain'],
  doc: ['application/msword', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
  xls: ['application/vnd.ms-excel', 'application/octet-stream'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
};

@Injectable()
export class OrderFilesService {
  constructor(private readonly db: Db, private readonly orders: OrdersService) {}
  private get base() { return uploadsPath; }
  private within(base: string, path: string) {
    const rel = relative(base, path);
    return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
  }
  sanitize(name?: string) {
    const safe = basename((name || 'arquivo').replace(/\\/g, '/')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    return !safe || safe === '.' || safe === '..' ? 'arquivo' : safe;
  }
  validateUpload(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new UnprocessableEntityException('Arquivo nao pode estar vazio.');
    if (file.size > 10 * 1024 * 1024 || file.buffer.length > 10 * 1024 * 1024) throw new UnprocessableEntityException('Arquivo excede o tamanho maximo de 10MB.');
    const name = this.sanitize(file.originalname);
    const extension = extname(name).slice(1).toLowerCase();
    if (!MIMES[extension]) throw new UnprocessableEntityException('Tipo de arquivo nao permitido.');
    if (!MIMES[extension].includes((file.mimetype || 'application/octet-stream').toLowerCase())) throw new UnprocessableEntityException('MIME type do arquivo nao permitido.');
    const buffer = file.buffer;
    const starts = (sig: number[] | string) => { const signature = Buffer.from(sig as any); return buffer.subarray(0, signature.length).equals(signature); };
    const valid = extension === 'pdf' ? starts('%PDF-') : extension === 'png' ? starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      : ['jpg', 'jpeg'].includes(extension) ? starts([0xff, 0xd8, 0xff]) : ['doc', 'xls'].includes(extension) ? starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
      : ['docx', 'xlsx'].includes(extension) ? starts([0x50, 0x4b, 0x03, 0x04]) : extension === 'txt' && !buffer.includes(0);
    if (!valid) throw new UnprocessableEntityException('Conteudo do arquivo nao corresponde ao tipo informado.');
    return name;
  }
  private response(file: any) {
    const { caminho, ...result } = file;
    return result;
  }
  async list(orderId: string, user?: any) {
    await this.orders.assertAccess(orderId, user);
    return (await this.db.query('select * from anexos where ordem_servico_id=$1 order by criado_em desc', [orderId])).map(row => this.response(row));
  }
  private async limit(orderId: string) {
    const result = await this.db.one('select count(*) as total from anexos where ordem_servico_id=$1', [orderId]);
    if (Number(result?.total) >= 20) throw new UnprocessableEntityException('O ticket atingiu o limite de 20 anexos.');
  }
  private async directory(orderId: string) {
    const directory = resolve(this.base, orderId);
    if (!this.within(this.base, directory)) throw new UnprocessableEntityException('Caminho de upload invalido.');
    await fs.mkdir(directory, { recursive: true });
    const realBase = await fs.realpath(this.base), realDirectory = await fs.realpath(directory);
    if (!this.within(realBase, realDirectory)) throw new UnprocessableEntityException('Caminho de upload invalido.');
    return realDirectory;
  }
  async save(orderId: string, file: Express.Multer.File, descricao?: string, enviadoPeloCliente = false, user?: any) {
    const name = this.validateUpload(file);
    if (descricao != null && (typeof descricao !== 'string' || descricao.length > 1000)) throw new BadRequestException('Descricao deve ter no maximo 1000 caracteres.');
    return this.db.transaction(async () => {
    const order = await this.orders.assertAccess(orderId, user);
    await this.limit(orderId);
    let destination: string | undefined;
    try {
      destination = resolve(await this.directory(orderId), uuid() + '-' + name);
      await fs.writeFile(destination, file.buffer, { flag: 'wx' });
      const result = await this.db.insert('anexos', {
        ordemServicoId: orderId, nomeArquivo: name, tipoArquivo: file.mimetype || 'application/octet-stream',
        tamanho: file.size, caminho: destination, descricao: descricao ?? null, enviadoPeloCliente,
      });
      await this.orders.notify(order, 'ANEXO', 'Novo anexo no ticket', `O ticket ${order.codigo} recebeu o anexo ${name}.`);
      return this.response(result);
    } catch (error) {
      if (destination) await fs.unlink(destination).catch(() => undefined);
      if (error instanceof UnprocessableEntityException) throw error;
      throw new UnprocessableEntityException('Falha ao salvar anexo.');
    }
    });
  }
  async copyExisting(orderId: string, origem: string, nomeArquivo: string, tipoArquivo: string, tamanho: number, enviadoPeloCliente = false, user?: any) {
    return this.db.transaction(async () => {
    await this.orders.assertAccess(orderId, user);
    await this.limit(orderId);
    let destination: string | undefined;
    try {
      const source = await this.safePath(origem);
      const name = this.sanitize(nomeArquivo);
      destination = resolve(await this.directory(orderId), uuid() + '-' + name);
      await fs.copyFile(source, destination);
      const result = await this.db.insert('anexos', { ordemServicoId: orderId, nomeArquivo: name, tipoArquivo, tamanho, caminho: destination, descricao: null, enviadoPeloCliente });
      return this.response(result);
    } catch (error) {
      if (destination) await fs.unlink(destination).catch(() => undefined);
      if (error instanceof UnprocessableEntityException) throw error;
      throw new UnprocessableEntityException('Falha ao copiar anexo para o ticket.');
    }
    });
  }
  private async safePath(path: string) {
    const safe = resolve(path);
    if (!this.within(this.base, safe)) throw new UnprocessableEntityException('Arquivo do anexo nao encontrado.');
    let real: string;
    try {
      real = await fs.realpath(safe);
      if (!this.within(await fs.realpath(this.base), real) || !(await fs.stat(real)).isFile()) throw new Error();
    } catch { throw new UnprocessableEntityException('Arquivo do anexo nao encontrado.'); }
    return real;
  }
  private async find(orderId: string, fileId: string) {
    const file = await this.db.one('select * from anexos where id=$1 and ordem_servico_id=$2', [fileId, orderId]);
    if (!file) throw new NotFoundException('Anexo nao encontrado.');
    return file;
  }
  async download(orderId: string, fileId: string, user?: any) {
    await this.orders.assertAccess(orderId, user);
    const file = await this.find(orderId, fileId);
    return { buffer: await fs.readFile(await this.safePath(file.caminho)), nomeArquivo: file.nomeArquivo, tipoArquivo: file.tipoArquivo };
  }
  async remove(orderId: string, fileId: string, user?: any) {
    return this.db.transaction(async () => {
    await this.orders.assertAccess(orderId, user);
    const file = await this.find(orderId, fileId);
    if (this.within(this.base, resolve(file.caminho))) {
      await fs.unlink(resolve(file.caminho)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw new UnprocessableEntityException('Falha ao excluir anexo.'); });
    }
    await this.db.query('delete from anexos where id=$1', [fileId]);
    });
  }
}
