import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/security';
import { OrderFilesService } from '../orders/order-files.service';
import { RequestRateLimitService } from '../requests/request-rate-limit.service';
import { ApprovePortalOrderDto, ConfirmPortalPaymentDto, PortalAttachmentDto, RejectPortalOrderDto } from './portal.dto';
import { PortalService } from './portal.service';

@ApiTags('Portal do cliente')
@Public()
@Controller('portal/clientes/:token')
export class PortalController {
  constructor(private readonly portal: PortalService, private readonly files: OrderFilesService,
    private readonly limits: RequestRateLimitService) {}

  @Get('ordens-servico')
  list(@Param('token') token: string) { return this.portal.list(token); }

  @Patch('ordens-servico/:ordemServicoId/aprovar')
  approve(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string,
    @Body() body: ApprovePortalOrderDto, @Req() request: Request) {
    this.limit('acao', token, request, 30);
    return this.portal.decision(token, id, true, body?.observacao);
  }

  @Patch('ordens-servico/:ordemServicoId/reprovar')
  reject(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string,
    @Body() body: RejectPortalOrderDto, @Req() request: Request) {
    this.limit('acao', token, request, 30);
    return this.portal.decision(token, id, false, body.observacao);
  }

  @Post('ordens-servico/:ordemServicoId/pagamento') @HttpCode(200)
  checkout(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string, @Req() request: Request) {
    this.limit('pagamento', token, request, 10);
    return this.portal.checkout(token, id);
  }

  @Post('ordens-servico/:ordemServicoId/pagamento/pix') @HttpCode(200)
  pix(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string, @Req() request: Request) {
    this.limit('pagamento', token, request, 10);
    return this.portal.pix(token, id);
  }

  @Post('ordens-servico/:ordemServicoId/pagamento/confirmar') @HttpCode(200)
  confirm(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string,
    @Body() body: ConfirmPortalPaymentDto, @Req() request: Request) {
    this.limit('pagamento', token, request, 10);
    return this.portal.confirmPayment(token, id, body.paymentId);
  }

  @Post('ordens-servico/:ordemServicoId/pagamento/verificar') @HttpCode(200)
  verify(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string, @Req() request: Request) {
    this.limit('pagamento', token, request, 10);
    return this.portal.verifyPayment(token, id);
  }

  @Get('ordens-servico/:ordemServicoId/anexos')
  async listFiles(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string) {
    await this.portal.authorized(token, id);
    return this.files.list(id);
  }

  @Post('ordens-servico/:ordemServicoId/anexos') @HttpCode(200) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async upload(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File, @Body() body: PortalAttachmentDto, @Req() request: Request) {
    this.limit('upload', token, request, 20);
    await this.portal.authorized(token, id);
    return this.files.save(id, file, body.descricao, true);
  }

  @Get('ordens-servico/:ordemServicoId/anexos/:anexoId/arquivo')
  async download(@Param('token') token: string, @Param('ordemServicoId', ParseUUIDPipe) id: string,
    @Param('anexoId', ParseUUIDPipe) attachmentId: string, @Res() response: Response) {
    await this.portal.authorized(token, id);
    const file = await this.files.download(id, attachmentId);
    response.type(file.tipoArquivo).set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.nomeArquivo)}`).send(file.buffer);
  }

  private limit(action: string, token: string, request: Request, count: number) {
    this.limits.register(`portal:${action}`, token, request.socket.remoteAddress || '', count);
  }
}
