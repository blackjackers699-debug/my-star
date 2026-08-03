import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const connectionString = config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is required. Copy .env.example to .env and configure PostgreSQL.');
    }
    this.pool = new Pool({ connectionString, ssl: config.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : undefined });
  }

  async onModuleInit() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        reference VARCHAR(64) PRIMARY KEY,
        customer_email VARCHAR(320) NOT NULL,
        plan_code VARCHAR(64) NOT NULL,
        amount_in_cents INTEGER NOT NULL,
        currency CHAR(3) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        checkout_expires_at TIMESTAMPTZ NOT NULL,
        payment_provider_transaction_id VARCHAR(128) UNIQUE,
        payment_method_type VARCHAR(32),
        membership_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS payment_orders_customer_email_idx ON payment_orders (customer_email);
      CREATE INDEX IF NOT EXISTS payment_orders_membership_expires_at_idx ON payment_orders (membership_expires_at);
    `);
  }

  query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
    return this.pool.query<T>(text, values);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
