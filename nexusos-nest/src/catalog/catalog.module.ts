import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { UsersController, ClientsController, ProjectsController } from './catalog.controller';
@Module({controllers:[UsersController,ClientsController,ProjectsController],providers:[CatalogService],exports:[CatalogService]})
export class CatalogModule {}
