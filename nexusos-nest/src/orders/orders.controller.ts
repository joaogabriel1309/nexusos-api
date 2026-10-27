import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, Roles } from '../common/security';
import { OrdersService } from './orders.service';
import { OrderExtrasService } from './order-extras.service';
import { OrderFilesService } from './order-files.service';
import { AnalysisDto, BranchDto, CalendarQueryDto, ChecklistDto, CommentDto, CreateOrderDto, LinksDto, OrderStatusDto, OwnerDto, PaidDto, PriorityDto, ReasonDto, SequenceDto, TimeEntryDto, UpdateOrderDto } from './orders.dto';

@ApiTags('Ordens de serviço')
@ApiBearerAuth()
@Controller('ordens-servico')
export class OrdersController {
  constructor(private readonly orders: OrdersService, private readonly extras: OrderExtrasService) {}
  @Get() list(@CurrentUser() user: any) { return this.orders.list(user); }
  @Get('pendencias') @Roles('ADMIN') pending() { return this.orders.pending(); }
  @Get(':id') find(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.orders.find(id, user); }
  @Post() @Roles('ADMIN') async create(@Body() body: CreateOrderDto, @CurrentUser() user: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.orders.create(body, user);
    response.location('/api/v1/ordens-servico/' + result.id);
    return result;
  }
  @Put(':id') @Roles('ADMIN') update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateOrderDto, @CurrentUser() user: any) { return this.orders.update(id, body, user); }
  @Delete(':id') @Roles('ADMIN') @HttpCode(204) remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.orders.remove(id, user); }
  @Patch(':id/status') @Roles('ADMIN', 'DESENVOLVEDOR') status(@Param('id', ParseUUIDPipe) id: string, @Body() body: OrderStatusDto, @CurrentUser() user: any) { return this.orders.transition(id, body, user); }
  @Patch(':id/reabrir') @Roles('ADMIN') reopen(@Param('id', ParseUUIDPipe) id: string, @Body() body: ReasonDto, @CurrentUser() user: any) { return this.orders.reopen(id, body, user); }
  @Patch(':id/cancelar') @Roles('ADMIN') cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: ReasonDto, @CurrentUser() user: any) { return this.orders.cancel(id, body, user); }
  @Patch(':id/analise') @Roles('ADMIN', 'DESENVOLVEDOR') analysis(@Param('id', ParseUUIDPipe) id: string, @Body() body: AnalysisDto, @CurrentUser() user: any) { return this.orders.analysis(id, body, user); }
  @Patch(':id/responsavel') @Roles('ADMIN') owner(@Param('id', ParseUUIDPipe) id: string, @Body() body: OwnerDto, @CurrentUser() user: any) { return this.orders.owner(id, body.responsavelId, user); }
  @Patch(':id/assumir') @Roles('ADMIN', 'DESENVOLVEDOR') assume(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.orders.assume(id, user); }
  @Patch(':id/prioridade') @Roles('ADMIN') priority(@Param('id', ParseUUIDPipe) id: string, @Body() body: PriorityDto, @CurrentUser() user: any) { return this.orders.priority(id, body.prioridade, user); }
  @Patch(':id/sequencia') @Roles('ADMIN') sequence(@Param('id', ParseUUIDPipe) id: string, @Body() body: SequenceDto, @CurrentUser() user: any) { return this.orders.sequence(id, body.posicao, user); }
  @Patch(':id/pagamento') @Roles('ADMIN') paid(@Param('id', ParseUUIDPipe) id: string, @Body() body: PaidDto, @CurrentUser() user: any) { return this.orders.paid(id, body.paga, user); }
  @Put(':id/vinculos') @Roles('ADMIN') links(@Param('id', ParseUUIDPipe) id: string, @Body() body: LinksDto, @CurrentUser() user: any) { return this.orders.links(id, body.ordemServicoIds, user); }
  @Post(':id/ia/analisar') @Roles('ADMIN', 'DESENVOLVEDOR') @HttpCode(200) ai(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.ai(id, user); }
  @Patch(':id/github') @Roles('ADMIN', 'DESENVOLVEDOR') githubBranch(@Param('id', ParseUUIDPipe) id: string, @Body() body: BranchDto, @CurrentUser() user: any) { return this.extras.branch(id, body.branch, user); }
  @Post(':id/github/sincronizar') @Roles('ADMIN', 'DESENVOLVEDOR') @HttpCode(200) github(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.github(id, user); }
  @Get(':id/github/branch-sugerida') @Roles('ADMIN', 'DESENVOLVEDOR') @Header('Content-Type', 'text/plain; charset=utf-8') suggestedBranch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.suggestedBranch(id, user); }
  @Get(':id/comprovante-finalizacao') @Roles('ADMIN', 'DESENVOLVEDOR') async pdf(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any, @Res() response: Response) {
    const file = await this.extras.pdf(id, user);
    response.type('application/pdf').attachment(`os-${file.codigo}-comprovante-finalizacao.pdf`).send(file.buffer);
  }
}

@ApiTags('Atividades dos tickets')
@ApiBearerAuth()
@Controller('ordens-servico/:ordemServicoId')
export class OrderActivitiesController {
  constructor(private readonly extras: OrderExtrasService, private readonly files: OrderFilesService) {}
  @Get('comentarios') comments(@Param('ordemServicoId', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.comments(id, user); }
  @Post('comentarios') @Roles('ADMIN', 'DESENVOLVEDOR') async comment(@Param('ordemServicoId', ParseUUIDPipe) id: string, @Body() body: CommentDto, @CurrentUser() user: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.extras.comment(id, body, user); response.location(`/api/v1/ordens-servico/${id}/comentarios`); return result;
  }
  @Get('checklist') checklist(@Param('ordemServicoId', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.checklist(id, user); }
  @Post('checklist') @Roles('ADMIN', 'DESENVOLVEDOR') async createChecklist(@Param('ordemServicoId', ParseUUIDPipe) id: string, @Body() body: ChecklistDto, @CurrentUser() user: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.extras.createChecklist(id, body, user); response.location('/api/v1/checklist/' + result.id); return result;
  }
  @Get('apontamentos') timeEntries(@Param('ordemServicoId', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.timeEntries(id, user); }
  @Post('apontamentos') @Roles('ADMIN', 'DESENVOLVEDOR') async timeEntry(@Param('ordemServicoId', ParseUUIDPipe) id: string, @Body() body: TimeEntryDto, @CurrentUser() user: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.extras.timeEntry(id, body, user); response.location(`/api/v1/ordens-servico/${id}/apontamentos`); return result;
  }
  @Get('anexos') attachments(@Param('ordemServicoId', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.files.list(id, user); }
  @Post('anexos') @Roles('ADMIN', 'DESENVOLVEDOR') @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 } }))
  async upload(@Param('ordemServicoId', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File, @Body('descricao') description: string, @CurrentUser() user: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.files.save(id, file, description, false, user); response.location(`/api/v1/ordens-servico/${id}/anexos`); return result;
  }
  @Get('anexos/:anexoId/arquivo') async download(@Param('ordemServicoId', ParseUUIDPipe) id: string, @Param('anexoId', ParseUUIDPipe) fileId: string, @CurrentUser() user: any, @Res() response: Response) {
    const file = await this.files.download(id, fileId, user);
    response.type(file.tipoArquivo).setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(file.nomeArquivo)); response.send(file.buffer);
  }
  @Delete('anexos/:anexoId') @Roles('ADMIN') @HttpCode(204) deleteFile(@Param('ordemServicoId', ParseUUIDPipe) id: string, @Param('anexoId', ParseUUIDPipe) fileId: string, @CurrentUser() user: any) { return this.files.remove(id, fileId, user); }
}

@ApiTags('Checklist')
@ApiBearerAuth()
@Controller('checklist')
export class ChecklistController {
  constructor(private readonly extras: OrderExtrasService) {}
  @Patch(':id/concluir') @Roles('ADMIN', 'DESENVOLVEDOR') finish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.finishChecklist(id, user); }
}

@ApiTags('Auditoria')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditController {
  constructor(private readonly extras: OrderExtrasService) {}
  @Get('ordens-servico/:id') list(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) { return this.extras.audit(id, user); }
}

@ApiTags('Calendario')
@ApiBearerAuth()
@Controller('calendario')
export class CalendarController {
  constructor(private readonly extras: OrderExtrasService) {}
  @Get() @Roles('ADMIN', 'DESENVOLVEDOR') list(@Query() query: CalendarQueryDto, @CurrentUser() user: any) { return this.extras.calendar(query, user); }
}
