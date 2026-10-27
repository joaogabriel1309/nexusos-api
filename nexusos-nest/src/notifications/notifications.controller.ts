import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Put, Query } from '@nestjs/common';
import { CurrentUser, Roles, User } from '../common/security';
import { NotificationsService } from './notifications.service';
@Controller('notificacoes')
@Roles('ADMIN','DESENVOLVEDOR')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() list(@CurrentUser() user: User) { return this.service.list(user.id); }
  @Get('historico') history(@CurrentUser() user: User, @Query() q: any) { return this.service.history(user.id,q); }
  @Get('preferencias') preferences(@CurrentUser() user: User) { return this.service.preferences(user.id); }
  @Put('preferencias') set(@CurrentUser() user: User, @Body() body: any) { return this.service.setPreferences(user.id,body?.preferencias); }
  @Patch('marcar-todas-lidas') @HttpCode(204) async readAll(@CurrentUser() user: User) { await this.service.read(user.id); }
  @Patch(':id/lida') @HttpCode(204) async read(@CurrentUser() user: User, @Param('id',ParseUUIDPipe) id: string) { await this.service.read(user.id,id); }
}
