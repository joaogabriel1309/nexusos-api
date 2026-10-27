import { BadRequestException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Db } from './db';
export const uuid = randomUUID;
export function required<T>(value: T, message = 'Campo obrigatório.'): NonNullable<T> {
  if (value == null || value === '' || typeof value === 'string' && !value.trim()) throw new UnprocessableEntityException(message);
  return value as NonNullable<T>;
}
export function notFound<T>(value: T | undefined | null, message = 'Recurso não encontrado.'): NonNullable<T> {
  if (value == null) throw new NotFoundException(message); return value as NonNullable<T>;
}
export function pagination(q: any) { const p = Number(q.page ?? 0), s = Number(q.size ?? 20); if (!Number.isInteger(p) || p < 0 || !Number.isInteger(s) || s < 1 || s > 200) throw new BadRequestException('Paginação inválida.'); return { p, s }; }
export function page(content: any[], total: number, number = 0, size = 20) {
  const totalPages = Math.ceil(total / size);
  return { content, pageable: { pageNumber: number, pageSize: size, offset: number * size, paged: true, unpaged: false, sort: { empty: true, sorted: false, unsorted: true } }, totalElements: total, totalPages, last: number + 1 >= totalPages, size, number, numberOfElements: content.length, first: number === 0, empty: !content.length, sort: { empty: true, sorted: false, unsorted: true } };
}
export async function audit(db: Db, orderId: string, userId: string | undefined | null, tipo: string, descricao: string, oldStatus?: string | null, newStatus?: string | null) {
  await db.insert('auditoria_os', { ordemServicoId: orderId, usuarioId: userId || null, tipoEvento: tipo, descricao, statusAnterior: oldStatus || null, statusNovo: newStatus || null });
}
export const html = (value: any) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
