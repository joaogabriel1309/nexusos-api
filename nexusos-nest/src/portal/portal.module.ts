import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OrdersModule } from '../orders/orders.module';
import { RequestsModule } from '../requests/requests.module';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [RequestsModule, OrdersModule, IntegrationsModule],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
