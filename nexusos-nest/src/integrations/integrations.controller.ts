import { Body, Controller, Get, Headers, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../common/security';
import { EmailSettingsDto, EmailTestDto, EmpresaSettingsDto, GithubSettingsDto, IaSettingsDto, OsSettingsDto, PaymentSettingsDto, WhatsappSettingsDto } from './integrations.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('Configurações')
@Controller('configuracoes')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get('empresa') @Roles('ADMIN', 'DESENVOLVEDOR')
  company() { return this.service.settingsResponse('empresa'); }

  @Put('empresa') @Roles('ADMIN')
  updateCompany(@Body() body: EmpresaSettingsDto) { return this.service.updateSettings('empresa', body); }

  @Get('os') @Roles('ADMIN')
  orders() { return this.service.settingsResponse('os'); }

  @Put('os') @Roles('ADMIN')
  updateOrders(@Body() body: OsSettingsDto) { return this.service.updateSettings('os', body); }

  @Get('ia') @Roles('ADMIN')
  ai() { return this.service.settingsResponse('ia'); }

  @Put('ia') @Roles('ADMIN')
  updateAi(@Body() body: IaSettingsDto) { return this.service.updateSettings('ia', body); }

  @Get('email') @Roles('ADMIN')
  email() { return this.service.settingsResponse('email'); }

  @Put('email') @Roles('ADMIN')
  updateEmail(@Body() body: EmailSettingsDto) { return this.service.updateSettings('email', body); }

  @Post('email/teste') @HttpCode(204) @Roles('ADMIN')
  async testEmail(@Body() body: EmailTestDto) {
    await this.service.sendEmail(body.destinatario, 'Teste de e-mail - NexusOS', 'Este e-mail confirma que a configuração SMTP do NexusOS está funcionando.', true, 'text');
  }

  @Get('whatsapp') @Roles('ADMIN', 'DESENVOLVEDOR')
  whatsapp() { return this.service.settingsResponse('whatsapp'); }

  @Put('whatsapp') @Roles('ADMIN')
  updateWhatsapp(@Body() body: WhatsappSettingsDto) { return this.service.updateSettings('whatsapp', body); }

  @Post('whatsapp/teste') @HttpCode(204) @Roles('ADMIN')
  async testWhatsapp() { await this.service.whatsappTest(); }

  @Get('github') @Roles('ADMIN')
  github() { return this.service.settingsResponse('github'); }

  @Put('github') @Roles('ADMIN')
  updateGithub(@Body() body: GithubSettingsDto) { return this.service.updateSettings('github', body); }

  @Post('github/testar-conexao') @HttpCode(204) @Roles('ADMIN')
  async testGithub() { await this.service.githubTest(); }

  @Get('pagamento') @Roles('ADMIN')
  payment() { return this.service.settingsResponse('pagamento'); }

  @Put('pagamento') @Roles('ADMIN')
  updatePayment(@Body() body: PaymentSettingsDto) { return this.service.updateSettings('pagamento', body); }
}

@ApiTags('Pagamentos')
@Controller('pagamentos/mercado-pago')
export class PaymentWebhookController {
  constructor(private readonly service: IntegrationsService) {}

  @Public() @Post('webhook') @HttpCode(200)
  async webhook(@Headers('x-signature') signature: string, @Headers('x-request-id') requestId: string,
    @Query() query: Record<string, string>, @Body() body?: any) {
    this.service.validateWebhook(signature, requestId, query['data.id']);
    const paymentId = query['data.id'] || query.id || body?.data?.id || body?.id;
    await this.service.notifyPayment(paymentId == null ? undefined : String(paymentId));
  }
}
