import { Controller, Get, Module, Query } from '@nestjs/common';
import { CurrentUser, Roles, User } from '../common/security';
import { ReportingService } from './reporting.service';
@Controller('dashboard') @Roles('ADMIN')
export class DashboardController {
  constructor(private readonly service:ReportingService){}
  @Get('resumo') summary(){return this.service.summary();}
  @Get('os-por-status') statuses(){return this.service.statuses();}
  @Get('produtividade') productivity(){return this.service.productivity();}
  @Get('finalizadas-por-mes') monthly(){return this.service.monthly();}
}
@Controller('busca-global') @Roles('ADMIN','DESENVOLVEDOR')
export class SearchController {
  constructor(private readonly service:ReportingService){}
  @Get() search(@Query('termo') term:string,@CurrentUser() user:User){return this.service.search(term,user);}
}
@Module({controllers:[DashboardController,SearchController],providers:[ReportingService]})
export class ReportingModule {}
