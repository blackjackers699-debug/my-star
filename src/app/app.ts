import { Component, signal } from '@angular/core';

const API_BASE_URL = 'https://my-star-1bb1.onrender.com';

interface CheckoutSession {
  checkoutUrl: string;
  fields: Record<string, string>;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly ageConfirmed = signal(false);
  protected readonly checkoutState = signal<'idle' | 'loading' | 'error'>('idle');
  protected readonly checkoutError = signal('');

  protected async startCheckout(event: Event, email: string) {
    event.preventDefault();
    this.checkoutError.set('');
    this.checkoutState.set('loading');

    try {
      const response = await fetch(API_BASE_URL + '/api/payments/checkout-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, planCode: 'vip-monthly' }),
      });
      const session = (await response.json()) as CheckoutSession | { message?: string };
      if (!response.ok || !('fields' in session)) {
        throw new Error('message' in session ? session.message : 'No fue posible iniciar el pago.');
      }

      sessionStorage.setItem('sofia-villa-payment-reference', session.fields['reference']);
      this.submitHostedCheckout(session);
    } catch (error) {
      this.checkoutError.set(error instanceof Error ? error.message : 'No fue posible iniciar el pago. Intentá de nuevo.');
      this.checkoutState.set('error');
    }
  }

  private submitHostedCheckout(session: CheckoutSession) {
    const form = document.createElement('form');
    form.action = session.checkoutUrl;
    form.method = 'GET';
    form.style.display = 'none';

    for (const [name, value] of Object.entries(session.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.append(input);
    }

    document.body.append(form);
    form.submit();
  }
}

