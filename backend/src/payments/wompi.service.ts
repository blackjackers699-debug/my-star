import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { WompiWebhookEvent } from './payments.types';

@Injectable()
export class WompiService {
  constructor(private readonly config: ConfigService) {}

  createCheckoutSignature(reference: string, amountInCents: number, currency: string, expirationTime: string) {
    const integritySecret = this.config.get<string>('WOMPI_INTEGRITY_SECRET');
    if (!integritySecret) throw new ServiceUnavailableException('Payments are not configured yet.');
    return this.sha256(`${reference}${amountInCents}${currency}${expirationTime}${integritySecret}`);
  }

  getPublicKey() {
    const key = this.config.get<string>('WOMPI_PUBLIC_KEY');
    if (!key) throw new ServiceUnavailableException('Payments are not configured yet.');
    return key;
  }

  getCheckoutUrl() {
    return this.config.get<string>('WOMPI_CHECKOUT_URL', 'https://checkout.wompi.co/p/');
  }

  getRedirectUrl() {
    const redirectUrl = this.config.get<string>('PAYMENT_REDIRECT_URL');
    if (!redirectUrl) throw new ServiceUnavailableException('PAYMENT_REDIRECT_URL is not configured.');
    return redirectUrl;
  }

  verifyWebhook(event: WompiWebhookEvent, providedChecksum?: string) {
    const secret = this.config.get<string>('WOMPI_EVENTS_SECRET');
    if (!secret) throw new ServiceUnavailableException('Webhook validation is not configured yet.');
    if (!event?.signature?.properties || !event.signature.checksum || !Number.isInteger(event.timestamp)) {
      throw new UnauthorizedException('Malformed payment event.');
    }

    const payload = event.signature.properties.map((path) => String(this.resolvePath(event.data, path))).join('');
    const expected = this.sha256(`${payload}${event.timestamp}${secret}`);
    const received = providedChecksum ?? event.signature.checksum;
    if (!this.safeEqual(expected, received)) throw new UnauthorizedException('Invalid payment event signature.');
  }

  private resolvePath(source: unknown, path: string): unknown {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object' || !(key in current)) {
        throw new UnauthorizedException('Payment event is missing a signed property.');
      }
      return (current as Record<string, unknown>)[key];
    }, source);
    if (value === null || value === undefined || typeof value === 'object') {
      throw new UnauthorizedException('Payment event has an invalid signed property.');
    }
    return value;
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private safeEqual(expected: string, received: string) {
    const left = Buffer.from(expected.toLowerCase());
    const right = Buffer.from(received.toLowerCase());
    return left.length === right.length && timingSafeEqual(left, right);
  }
}

