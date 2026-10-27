import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OrdersService } from './orders.service';
import { OrderExtrasService } from './order-extras.service';
import { OrderFilesService } from './order-files.service';
import { AuditController, CalendarController, ChecklistController, OrderActivitiesController, OrdersController } from './orders.controller';

@Module({ imports: [IntegrationsModule], controllers: [OrdersController, OrderActivitiesController, ChecklistController, AuditController, CalendarController], providers: [OrdersService, OrderExtrasService, OrderFilesService], exports: [OrdersService, OrderExtrasService, OrderFilesService] })
export class OrdersModule {}
