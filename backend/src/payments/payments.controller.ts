import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout-sessions')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.payments.createCheckoutSession(dto);
  }

  @Get(':reference/status')
  status(@Param('reference') reference: string) {
    return this.payments.getStatus(reference);
  }
}
