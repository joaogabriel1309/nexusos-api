import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { RequestsController, PortalRequestsController } from './requests.controller';
import { RequestRateLimitService } from './request-rate-limit.service';
import { RequestsService } from './requests.service';

@Module({
  imports: [OrdersModule],
  controllers: [RequestsController, PortalRequestsController],
  providers: [RequestsService, RequestRateLimitService],
  exports: [RequestsService, RequestRateLimitService],
})
export class RequestsModule {}
