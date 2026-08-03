import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentOrdersRepository } from './payment-orders.repository';
import { PaymentOrder, PLANS, WompiTransaction } from './payments.types';
import { WompiService } from './wompi.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly orders: PaymentOrdersRepository,
    private readonly wompi: WompiService,
  ) {}

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    const plan = PLANS[dto.planCode];
    const reference = `SV-${randomUUID().replaceAll('-', '')}`;
    const expirationTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const redirectUrl = new URL(this.wompi.getRedirectUrl());
    redirectUrl.searchParams.set('reference', reference);

    await this.orders.create({
      reference,
      email: dto.email.toLowerCase(),
      planCode: dto.planCode,
      amountInCents: plan.amountInCents,
      currency: plan.currency,
      expiresAt: new Date(expirationTime),
    });

    return {
      checkoutUrl: this.wompi.getCheckoutUrl(),
      fields: {
        'public-key': this.wompi.getPublicKey(),
        currency: plan.currency,
        'amount-in-cents': String(plan.amountInCents),
        reference,
        'signature:integrity': this.wompi.createCheckoutSignature(reference, plan.amountInCents, plan.currency, expirationTime),
        'expiration-time': expirationTime,
        'redirect-url': redirectUrl.toString(),
        'customer-data:email': dto.email.toLowerCase(),
      },
    };
  }

  async handleApprovedOrFinalTransaction(transaction: WompiTransaction) {
    const order = await this.orders.findByReference(transaction.reference);
    if (!order) throw new NotFoundException('Unknown payment reference.');
    if (order.amount_in_cents !== transaction.amount_in_cents || order.currency !== transaction.currency) {
      throw new BadRequestException('Payment amount or currency does not match the order.');
    }
    if (!['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'].includes(transaction.status)) {
      throw new BadRequestException('Unsupported payment status.');
    }

    const plan = PLANS[order.plan_code];
    return this.orders.applyTransaction({
      id: transaction.id,
      reference: transaction.reference,
      status: transaction.status,
      paymentMethodType: transaction.payment_method_type,
      accessDays: plan.accessDays,
    });
  }

  async getStatus(reference: string) {
    const order = await this.orders.findByReference(reference);
    if (!order) throw new NotFoundException('Payment not found.');
    return {
      reference: order.reference,
      status: order.status,
      membershipExpiresAt: order.membership_expires_at,
      accessGranted: order.status === 'APPROVED' && !!order.membership_expires_at && order.membership_expires_at > new Date(),
    };
  }
}

