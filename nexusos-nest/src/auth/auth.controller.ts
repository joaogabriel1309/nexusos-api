import { Body, Controller, HttpCode, Module, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public, ACCESS_COOKIE, REFRESH_COOKIE } from '../common/security';
import { prod } from '../common/env';
import { AuthService } from './auth.service';
import { ForgotDto, LoginDto, RefreshDto, ResetDto } from './auth.dto';
import { IntegrationsModule } from '../integrations/integrations.module';
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  private cookies(res: Response, result?: any) {
    const options = { httpOnly: true, secure: process.env.AUTH_COOKIE_SECURE ? process.env.AUTH_COOKIE_SECURE === 'true' : prod, sameSite: (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase() as 'lax' | 'strict' | 'none', path: '/' };
    if (!result) { res.clearCookie(ACCESS_COOKIE, options); res.clearCookie(REFRESH_COOKIE, options); return; }
    res.cookie(ACCESS_COOKIE, result.accessToken, { ...options, maxAge: Number(process.env.JWT_ACCESS_EXPIRATION_MINUTES || 15) * 60000 });
    res.cookie(REFRESH_COOKIE, result.refreshToken, { ...options, maxAge: Number(process.env.JWT_REFRESH_EXPIRATION_DAYS || 7) * 86400000 });
    return result;
  }
  @Post('login') @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.cookies(res, await this.service.login(body.email, body.senha, req.socket.remoteAddress || '')); }
  @Post('refresh') @HttpCode(200)
  async refresh(@Body() body: RefreshDto | undefined, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.cookies(res, await this.service.refresh(body?.refreshToken ?? req.cookies?.[REFRESH_COOKIE])); }
  @Post('me') @HttpCode(200)
  async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.cookies(res, await this.service.refresh(req.cookies?.[REFRESH_COOKIE])); }
  @Post('logout') @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { await this.service.logout(req.cookies?.[REFRESH_COOKIE]); this.cookies(res); }
  @Post('forgot-password') @HttpCode(204)
  async forgot(@Body() body: ForgotDto, @Req() req: Request) { await this.service.forgot(body.email, req.socket.remoteAddress || ''); }
  @Post('reset-password') @HttpCode(204)
  async reset(@Body() body: ResetDto) { await this.service.reset(body.token, body.novaSenha); }
}
@Module({ imports: [IntegrationsModule], controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
