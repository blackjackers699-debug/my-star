import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PaymentOrder, PaymentStatus, PlanCode } from './payments.types';

@Injectable()
export class PaymentOrdersRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(input: {
    reference: string;
    email: string;
    planCode: PlanCode;
    amountInCents: number;
    currency: string;
    expiresAt: Date;
  }): Promise<PaymentOrder> {
    const result = await this.database.query<PaymentOrder>(
      `INSERT INTO payment_orders
        (reference, customer_email, plan_code, amount_in_cents, currency, checkout_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.reference, input.email, input.planCode, input.amountInCents, input.currency, input.expiresAt],
    );
    return result.rows[0];
  }

  async findByReference(reference: string): Promise<PaymentOrder | null> {
    const result = await this.database.query<PaymentOrder>('SELECT * FROM payment_orders WHERE reference = $1', [reference]);
    return result.rows[0] ?? null;
  }

  async applyTransaction(transaction: {
    id: string;
    reference: string;
    status: PaymentStatus;
    paymentMethodType?: string;
    accessDays: number;
  }): Promise<PaymentOrder | null> {
    const result = await this.database.query<PaymentOrder>(
      `UPDATE payment_orders
       SET status = $2,
           payment_provider_transaction_id = $3,
           payment_method_type = $4,
           membership_expires_at = CASE
             WHEN $2 = 'APPROVED' AND status <> 'APPROVED'
             THEN GREATEST(COALESCE(membership_expires_at, NOW()), NOW()) + ($5::text || ' days')::interval
             ELSE membership_expires_at
           END,
           updated_at = NOW()
       WHERE reference = $1
       RETURNING *`,
      [transaction.reference, transaction.status, transaction.id, transaction.paymentMethodType ?? null, transaction.accessDays],
    );
    return result.rows[0] ?? null;
  }
}
