import { Global, Module } from '@nestjs/common';
import { IntegrationsController, PaymentWebhookController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Global()
@Module({ controllers: [IntegrationsController, PaymentWebhookController], providers: [IntegrationsService], exports: [IntegrationsService] })
export class IntegrationsModule {}
