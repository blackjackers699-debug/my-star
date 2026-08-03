import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { WompiWebhookEvent } from './payments.types';
import { WompiService } from './wompi.service';

describe('WompiService', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        WOMPI_INTEGRITY_SECRET: 'integrity-secret',
        WOMPI_EVENTS_SECRET: 'events-secret',
        WOMPI_PUBLIC_KEY: 'pub_test_key',
      };
      return values[key] ?? fallback;
    }),
  } as unknown as ConfigService;

  it('signs a checkout session with the expiration time before the secret', () => {
    const service = new WompiService(config);
    const signature = service.createCheckoutSignature('SV-123', 1_390_000, 'COP', '2026-01-01T00:00:00.000Z');
    const expected = createHash('sha256').update('SV-1231390000COP2026-01-01T00:00:00.000Zintegrity-secret').digest('hex');
    expect(signature).toBe(expected);
  });

  it('accepts only a correctly signed Wompi webhook', () => {
    const service = new WompiService(config);
    const event: WompiWebhookEvent = {
      event: 'transaction.updated',
      data: { transaction: { id: 'transaction-1', reference: 'SV-123', status: 'APPROVED', amount_in_cents: 1_390_000, currency: 'COP' } },
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
      timestamp: 1_700_000_000,
    };
    event.signature.checksum = createHash('sha256')
      .update(`transaction-1APPROVED1390000${event.timestamp}events-secret`)
      .digest('hex');
    expect(() => service.verifyWebhook(event)).not.toThrow();
  });
});



