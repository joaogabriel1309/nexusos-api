import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../common/security';
import { CatalogService } from './catalog.service';
import { ClientDto, ClientUpdateDto, ProjectDto, ProjectUpdateDto, UserDto, UserUpdateDto } from './catalog.dto';
@Controller('usuarios') @Roles('ADMIN')
export class UsersController {
  constructor(private readonly service: CatalogService) {}
  @Get() list(){return this.service.users();}
  @Get(':id') find(@Param('id',ParseUUIDPipe) id:string){return this.service.user(id);}
  @Post() async create(@Body() body: UserDto,@Res({passthrough:true}) res:Response){const value=await this.service.saveUser(body); res.location('/api/v1/usuarios/'+value.id);return value;}
  @Put(':id') update(@Param('id',ParseUUIDPipe) id:string,@Body() body:UserUpdateDto){return this.service.saveUser(body,id);}
  @Delete(':id') @HttpCode(204) async remove(@Param('id',ParseUUIDPipe) id:string){await this.service.disableUser(id);}
}
@Controller('clientes') @Roles('ADMIN')
export class ClientsController {
  constructor(private readonly service:CatalogService){}
  @Get() list(){return this.service.clients();}
  @Get(':id') find(@Param('id',ParseUUIDPipe) id:string){return this.service.client(id);}
  @Post() async create(@Body() body:ClientDto,@Res({passthrough:true}) res:Response){const value=await this.service.saveClient(body);res.location('/api/v1/clientes/'+value.id);return value;}
  @Put(':id') update(@Param('id',ParseUUIDPipe) id:string,@Body() body:ClientUpdateDto){return this.service.saveClient(body,id);}
  @Patch(':id/token-acesso') rotate(@Param('id',ParseUUIDPipe) id:string){return this.service.rotateToken(id);}
  @Delete(':id') @HttpCode(204) async remove(@Param('id',ParseUUIDPipe) id:string){await this.service.disableClient(id);}
}
@Controller('projetos') @Roles('ADMIN')
export class ProjectsController {
  constructor(private readonly service:CatalogService){}
  @Get() list(){return this.service.projects();}
  @Get(':id') find(@Param('id',ParseUUIDPipe) id:string){return this.service.project(id);}
  @Post() async create(@Body() body:ProjectDto,@Res({passthrough:true}) res:Response){const value=await this.service.saveProject(body);res.location('/api/v1/projetos/'+value.id);return value;}
  @Put(':id') update(@Param('id',ParseUUIDPipe) id:string,@Body() body:ProjectUpdateDto){return this.service.saveProject(body,id);}
  @Delete(':id') @HttpCode(204) async remove(@Param('id',ParseUUIDPipe) id:string){await this.service.disableProject(id);}
}
