import { BadRequestException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { Db } from '../common/db';
import { Tokens, User } from '../common/security';
import { html } from '../common/helpers';
import { IntegrationsService } from '../integrations/integrations.service';
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; until: number }>();
  constructor(private readonly db: Db, private readonly tokens: Tokens, private readonly integrations: IntegrationsService) {}
  private keys(action: string, email: string, ip: string) { const normalized = email.trim().toLowerCase(); return [action + ':email:' + tokenHash(normalized), action + ':ip:' + tokenHash(normalized + '|' + ip)]; }
  private state(key: string, duration: number) {
    const now = Date.now();
    if (this.attempts.size >= 10000) { for (const [k,v] of this.attempts) if (v.until < now) this.attempts.delete(k); if (!this.attempts.has(key) && this.attempts.size >= 10000) throw new HttpException('Muitas tentativas em pouco tempo.', 429); }
    if (!this.attempts.has(key) || this.attempts.get(key)!.until < now) this.attempts.set(key, { count: 0, until: now + duration });
    return this.attempts.get(key)!;
  }
  async login(email: string, senha: string, ip: string) {
    const keys = this.keys('login', email, ip);
    if (keys.some(key => this.state(key, 600000).count >= 5)) throw new HttpException('Muitas tentativas de login.', 429);
    const user = await this.db.one('select * from usuarios where email=$1', [email.trim().toLowerCase()]);
    if (!user?.ativo || !await compare(senha, user.senha)) { keys.forEach(key => this.state(key, 600000).count++); throw new UnauthorizedException('Credenciais inválidas.'); }
    keys.forEach(key => this.attempts.delete(key));
    return this.db.transaction(() => this.issue(user));
  }
  private async issue(user: User) {
    const accessToken = this.tokens.issue(user, 'access'), refreshToken = this.tokens.issue(user, 'refresh');
    const payload = this.tokens.read(refreshToken, 'refresh');
    await this.db.insert('refresh_tokens', { usuarioId: user.id, tokenHash: tokenHash(refreshToken), expiraEm: new Date(payload.exp! * 1000) });
    return { accessToken, refreshToken, tokenType: 'Bearer', usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } };
  }
  async refresh(token: string) {
    if (!token) throw new UnauthorizedException('Refresh token inválido.');
    // Commit revocations even when rejecting replay, to prevent reuse of a rotated session.
    const result = await this.db.transaction(async () => {
      const stored = await this.db.one('select * from refresh_tokens where token_hash=$1 for update', [tokenHash(token)]);
      if (!stored) return null;
      if (stored.revogadoEm) { await this.db.query('update refresh_tokens set revogado_em=now() where usuario_id=$1 and revogado_em is null', [stored.usuarioId]); return null; }
      if (new Date(stored.expiraEm).getTime() <= Date.now()) return null;
      let payload: any;
      try { payload = this.tokens.read(token, 'refresh'); } catch { await this.db.update('refresh_tokens', stored.id, { revogadoEm: new Date() }); return null; }
      const user = await this.db.one<User>('select id,nome,email,perfil,ativo from usuarios where id=$1 and email=$2 and ativo=true', [stored.usuarioId, payload.sub]);
      if (!user) { await this.db.update('refresh_tokens', stored.id, { revogadoEm: new Date() }); return null; }
      const fresh = await this.issue(user);
      await this.db.update('refresh_tokens', stored.id, { revogadoEm: new Date(), substituidoPorHash: tokenHash(fresh.refreshToken) });
      return fresh;
    });
    if (!result) throw new UnauthorizedException('Refresh token expirado ou revogado.');
    return result;
  }
  async logout(token?: string) { if (token) await this.db.query('update refresh_tokens set revogado_em=now() where token_hash=$1 and revogado_em is null', [tokenHash(token)]); }
  async forgot(email: string, ip: string) {
    const keys = this.keys('recuperacao', email, ip);
    if (keys.map(key => ++this.state(key, 3600000).count).some(count => count > 3)) throw new HttpException('Muitas solicitações de recuperação. Aguarde antes de tentar novamente.', 429);
    const user = await this.db.one('select * from usuarios where email=$1 and ativo=true', [email.trim().toLowerCase()]);
    if (!user) return;
    const token = randomBytes(32).toString('base64url');
    await this.db.transaction(async () => {
      await this.db.query('update password_reset_tokens set usado_em=now() where usuario_id=$1 and usado_em is null', [user.id]);
      await this.db.insert('password_reset_tokens', { usuarioId: user.id, tokenHash: tokenHash(token), expiraEm: new Date(Date.now() + 3600000) });
      const link = `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/redefinir-senha?token=${encodeURIComponent(token)}`;
      await this.integrations.sendEmail(user.email, 'NexusOS - Recuperação de senha', `<p>Para redefinir sua senha, acesse <a href="${html(link)}">este link</a>. Ele expira em 60 minutos.</p>`).catch(() => undefined);
    });
  }
  async reset(token: string, password: string) {
    await this.db.transaction(async () => {
      const reset = await this.db.one('select r.*,u.ativo from password_reset_tokens r join usuarios u on u.id=r.usuario_id where r.token_hash=$1 for update of r', [tokenHash(token)]);
      if (!reset?.ativo || reset.usadoEm || new Date(reset.expiraEm).getTime() <= Date.now()) throw new BadRequestException('Link de recuperação inválido ou expirado.');
      await this.db.update('usuarios', reset.usuarioId, { senha: await hash(password, 10) });
      await this.db.query('update password_reset_tokens set usado_em=now() where usuario_id=$1 and usado_em is null', [reset.usuarioId]);
      await this.db.query('update refresh_tokens set revogado_em=now() where usuario_id=$1 and revogado_em is null', [reset.usuarioId]);
    });
  }
}
