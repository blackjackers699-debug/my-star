import { Module } from '@nestjs/common';
import { PaymentOrdersRepository } from './payment-orders.repository';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WompiWebhookController } from './wompi-webhook.controller';
import { WompiService } from './wompi.service';

@Module({
  controllers: [PaymentsController, WompiWebhookController],
  providers: [PaymentOrdersRepository, PaymentsService, WompiService],
})
export class PaymentsModule {}
