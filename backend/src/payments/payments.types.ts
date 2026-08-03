export const PLANS = {
  'vip-monthly': { amountInCents: 1_390_000, accessDays: 30, currency: 'COP' },
} as const;

export type PlanCode = keyof typeof PLANS;
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface PaymentOrder {
  reference: string;
  customer_email: string;
  plan_code: PlanCode;
  amount_in_cents: number;
  currency: string;
  status: PaymentStatus;
  checkout_expires_at: Date;
  payment_provider_transaction_id: string | null;
  payment_method_type: string | null;
  membership_expires_at: Date | null;
}

export interface WompiTransaction {
  id: string;
  reference: string;
  status: PaymentStatus;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
}

export interface WompiWebhookEvent {
  event: string;
  data: { transaction?: WompiTransaction };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
}

