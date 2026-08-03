import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { WompiWebhookEvent } from './payments.types';
import { PaymentsService } from './payments.service';
import { WompiService } from './wompi.service';

@Controller('webhooks/wompi')
export class WompiWebhookController {
  constructor(
    private readonly wompi: WompiService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  @SkipThrottle()
  @HttpCode(200)
  async receive(@Body() event: WompiWebhookEvent, @Headers('x-event-checksum') checksum?: string) {
    this.wompi.verifyWebhook(event, checksum);
    if (event.event === 'transaction.updated' && event.data?.transaction) {
      await this.payments.handleApprovedOrFinalTransaction(event.data.transaction);
    }
    return { received: true };
  }
}


