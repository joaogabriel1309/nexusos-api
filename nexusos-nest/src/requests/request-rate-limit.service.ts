import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class RequestRateLimitService {
  private readonly buckets = new Map<string, { counters: Map<string, { start: number; count: number }>; operations: number }>();
  private readonly window = 10 * 60 * 1000;

  register(action: string, token: string, ip: string, limit: number) {
    const now = Date.now();
    const group = action.split(':')[0];
    if (!this.buckets.has(group)) this.buckets.set(group, { counters: new Map(), operations: 0 });
    const bucket = this.buckets.get(group)!;
    if (++bucket.operations % 128 === 0) this.clearExpired(bucket.counters, now);
    this.consume(bucket.counters, `${action}|token|${this.hash(token)}`, limit, now);
    this.consume(bucket.counters, `${action}|ip|${this.hash(ip)}`, limit * 100, now);
  }

  private hash(value: string) {
    return createHash('sha256').update(value || '').digest('hex').slice(0, 32);
  }

  private consume(counters: Map<string, { start: number; count: number }>, key: string, limit: number, now: number) {
    if (!counters.has(key) && counters.size >= 10_000) {
      this.clearExpired(counters, now);
      if (counters.size >= 10_000) this.exceeded();
    }
    const old = counters.get(key);
    const counter = !old || old.start + this.window < now
      ? { start: now, count: 1 }
      : { start: old.start, count: old.count + 1 };
    counters.set(key, counter);
    if (counter.count > limit) this.exceeded();
  }

  private clearExpired(counters: Map<string, { start: number; count: number }>, now: number) {
    for (const [key, counter] of counters) {
      if (counter.start + this.window < now) counters.delete(key);
    }
  }

  private exceeded(): never {
    throw new HttpException('Muitas solicitacoes em pouco tempo. Aguarde alguns minutos.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
