import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, PayloadTooLargeException, Post, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, Public, Roles } from '../common/security';
import { ConvertRequestDto, CreatePortalRequestDto, RejectRequestDto, RequestMessageDto, RequestOwnerDto } from './requests.dto';
import { RequestRateLimitService } from './request-rate-limit.service';
import { RequestsService } from './requests.service';

@ApiTags('Solicitacoes')
@Roles('ADMIN')
@Controller('solicitacoes')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  list() { return this.requests.list(); }

  @Get('resumo')
  counts() { return this.requests.counts(); }

  @Get(':id')
  find(@Param('id', ParseUUIDPipe) id: string) { return this.requests.find(id); }

  @Patch(':id/assumir')
  claim(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.requests.claim(id, user); }

  @Patch(':id/responsavel')
  owner(@Param('id', ParseUUIDPipe) id: string, @Body() body: RequestOwnerDto, @CurrentUser() user: any) {
    return this.requests.owner(id, body.responsavelId, user);
  }

  @Post(':id/esclarecimentos') @HttpCode(200)
  clarify(@Param('id', ParseUUIDPipe) id: string, @Body() body: RequestMessageDto, @CurrentUser() user: any) {
    return this.requests.clarify(id, body.mensagem, user);
  }

  @Post(':id/rejeitar') @HttpCode(200)
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() body: RejectRequestDto, @CurrentUser() user: any) {
    return this.requests.reject(id, body, user);
  }

  @Post(':id/converter') @HttpCode(200)
  convert(@Param('id', ParseUUIDPipe) id: string, @Body() body: ConvertRequestDto, @CurrentUser() user: any) {
    return this.requests.convert(id, body, user);
  }

  @Get(':id/anexos/:anexoId/arquivo')
  async download(@Param('id', ParseUUIDPipe) id: string, @Param('anexoId', ParseUUIDPipe) attachmentId: string, @Res() response: Response) {
    await this.requests.entity(id);
    const file = await this.requests.download(id, attachmentId);
    response.type(file.tipoArquivo).set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.nomeArquivo)}`).send(file.buffer);
  }
}

@ApiTags('Portal - Solicitacoes')
@Public()
@Controller('portal/clientes/:token/solicitacoes')
export class PortalRequestsController {
  constructor(private readonly requests: RequestsService, private readonly limits: RequestRateLimitService) {}

  @Get()
  list(@Param('token') token: string) { return this.requests.listPortal(token); }

  @Get(':id')
  find(@Param('token') token: string, @Param('id', ParseUUIDPipe) id: string) { return this.requests.findPortal(token, id); }

  @Post() @HttpCode(200) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('arquivos', undefined, { limits: { fileSize: 10 * 1024 * 1024 } }))
  create(@Param('token') token: string, @Body() body: CreatePortalRequestDto,
    @UploadedFiles() files: Express.Multer.File[], @Req() request: Request) {
    this.uploadLimit(request, files);
    this.limits.register('request:criacao', token, request.socket.remoteAddress || '', 5);
    return this.requests.createPortal(token, body, files);
  }

  @Post(':id/respostas') @HttpCode(200) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('arquivos', undefined, { limits: { fileSize: 10 * 1024 * 1024 } }))
  reply(@Param('token') token: string, @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RequestMessageDto, @UploadedFiles() files: Express.Multer.File[], @Req() request: Request) {
    this.uploadLimit(request, files);
    this.limits.register('request:resposta', token, request.socket.remoteAddress || '', 30);
    return this.requests.replyPortal(token, id, body.mensagem, files);
  }

  @Get(':id/anexos/:anexoId/arquivo')
  async download(@Param('token') token: string, @Param('id', ParseUUIDPipe) id: string,
    @Param('anexoId', ParseUUIDPipe) attachmentId: string, @Res() response: Response) {
    await this.requests.authorized(token, id);
    const file = await this.requests.download(id, attachmentId);
    response.type(file.tipoArquivo).set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.nomeArquivo)}`).send(file.buffer);
  }

  private uploadLimit(request: Request, files?: Express.Multer.File[]) {
    if (Number(request.headers['content-length'] || 0) > 12 * 1024 * 1024 ||
      (files || []).reduce((size, file) => size + file.size, 0) > 12 * 1024 * 1024) {
      throw new PayloadTooLargeException('O arquivo excede o limite permitido.');
    }
  }
}
