import { Global, Module, CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sign, verify, Algorithm, JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { Db } from './db';
import { origins, prod } from './env';
export type User = { id: string; nome: string; email: string; perfil: 'ADMIN' | 'DESENVOLVEDOR'; ativo: boolean };
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator((_, ctx: ExecutionContext): User => ctx.switchToHttp().getRequest().user);
export const ACCESS_COOKIE = 'nexusos_access_token';
export const REFRESH_COOKIE = 'nexusos_refresh_token';
@Injectable()
export class Tokens {
  private key: Buffer;
  private algorithm: Algorithm;
  readonly accessSeconds = Number(process.env.JWT_ACCESS_EXPIRATION_MINUTES || 15) * 60;
  readonly refreshSeconds = Number(process.env.JWT_REFRESH_EXPIRATION_DAYS || 7) * 86400;
  constructor() {
    const secret = process.env.JWT_SECRET || (!prod ? 'nexusos-local-dev-secret-32-bytes-minimum-use-only-dev' : '');
    if (!secret || secret.startsWith('change-this-secret')) throw new Error('Configure JWT_SECRET com pelo menos 256 bits.');
    this.key = /^[A-Za-z0-9+/]+={0,2}$/.test(secret) ? Buffer.from(secret, 'base64') : Buffer.from(secret);
    if (this.key.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 256 bits.');
    this.algorithm = this.key.length >= 64 ? 'HS512' : this.key.length >= 48 ? 'HS384' : 'HS256';
  }
  issue(user: User, type: 'access' | 'refresh') {
    return sign({ perfil: user.perfil, token_type: type }, this.key, { algorithm: this.algorithm, subject: user.email, jwtid: randomUUID(), expiresIn: type === 'access' ? this.accessSeconds : this.refreshSeconds });
  }
  read(token: string, type: 'access' | 'refresh'): JwtPayload {
    try {
      const payload = verify(token, this.key, { algorithms: ['HS256', 'HS384', 'HS512'] }) as JwtPayload;
      if (payload.token_type !== type || !payload.sub) throw new Error();
      return payload;
    } catch { throw new UnauthorizedException('Token inválido ou expirado.'); }
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly db: Db, private readonly tokens: Tokens) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(req.method) && (req.cookies?.[ACCESS_COOKIE] != null || req.cookies?.[REFRESH_COOKIE] != null)) {
      let origin: string | undefined;
      try { const parsed = new URL(req.headers.origin); if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username) throw new Error(); origin = parsed.origin; } catch {}
      if (!origin || ![...origins, `${req.protocol}://${req.get('host')}`].includes(origin)) throw new ForbiddenException('Origem da requisição não permitida.');
    }
    if (this.reflector.getAllAndOverride('public', [ctx.getHandler(), ctx.getClass()])) return true;
    const bearer = typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined;
    const token = bearer || req.cookies?.[ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException('Autenticação necessária.');
    const payload = this.tokens.read(token, 'access');
    const user = await this.db.one<User>('select id,nome,email,perfil,ativo from usuarios where email=$1 and ativo=true', [payload.sub]);
    if (!user) throw new UnauthorizedException('Usuário indisponível.');
    req.user = user;
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(user.perfil)) throw new ForbiddenException('Acesso negado.');
    return true;
  }
}

@Global()
@Module({ providers: [Tokens], exports: [Tokens] })
export class SecurityModule {}
