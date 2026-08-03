import { Component, OnInit, signal } from '@angular/core';

const API_BASE_URL = 'https://my-star-1bb1.onrender.com';

type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

interface CheckoutSession {
  checkoutUrl: string;
  fields: Record<string, string>;
}

interface PaymentStatusResponse {
  reference: string;
  status: PaymentStatus;
  membershipExpiresAt: string | null;
  accessGranted: boolean;
}

interface VipMedia {
  src: string;
  label: string;
}

interface ChatMessage {
  id: number;
  sender: 'sofia' | 'user';
  text: string;
  previewSrc?: string;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly ageConfirmed = signal(false);
  protected readonly checkoutState = signal<'idle' | 'loading' | 'error'>('idle');
  protected readonly checkoutError = signal('');
  protected readonly paymentState = signal<'storefront' | 'checking' | 'approved' | 'failed'>('storefront');
  protected readonly paymentMessage = signal('');
  protected readonly chatOpen = signal(false);
  protected readonly chatPrompt = signal(false);
  protected readonly chatTyping = signal(false);
  protected readonly chatMessages = signal<ChatMessage[]>([
    { id: 1, sender: 'sofia', text: 'Hola... estaba pensando en vos. Te quedas un ratito conmigo?' },
  ]);
  private nextChatMessageId = 2;
  protected readonly photos: VipMedia[] = [
    { src: '/media/sofia-villa/photos/image0.jpg', label: 'Sesi\u00f3n privada 01' },
    { src: '/media/sofia-villa/photos/image1.jpg', label: 'Sesi\u00f3n privada 02' },
    { src: '/media/sofia-villa/photos/image2.jpg', label: 'Sesi\u00f3n privada 03' },
    { src: '/media/sofia-villa/photos/image3.jpg', label: 'Sesi\u00f3n privada 04' },
    { src: '/media/sofia-villa/photos/image4.jpg', label: 'Sesi\u00f3n privada 05' },
    { src: '/media/sofia-villa/photos/image5.jpg', label: 'Sesi\u00f3n privada 06' },
  ];
  protected readonly videos: VipMedia[] = [
    { src: '/media/sofia-villa/videos/video0.mp4', label: 'Video privado 01' },
    { src: '/media/sofia-villa/videos/video1.mp4', label: 'Video privado 02' },
    { src: '/media/sofia-villa/videos/video2.mp4', label: 'Video privado 03' },
    { src: '/media/sofia-villa/videos/video3.mp4', label: 'Video privado 04' },
    { src: '/media/sofia-villa/videos/video4.mp4', label: 'Video privado 05' },
  ];

  ngOnInit() {
    window.setTimeout(() => this.showChatPrompt(), 12_000);
    window.setInterval(() => this.showChatPrompt(), 60_000);

    const reference = new URLSearchParams(window.location.search).get('reference') ?? sessionStorage.getItem('sofia-villa-vip-reference');
    if (!reference) return;

    this.ageConfirmed.set(true);
    void this.confirmPayment(reference);
  }

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

      this.submitHostedCheckout(session);
    } catch (error) {
      this.checkoutError.set(error instanceof Error ? error.message : 'No fue posible iniciar el pago. Intentalo de nuevo.');
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

  protected openChat() {
    this.chatOpen.set(true);
    this.chatPrompt.set(false);
  }

  protected closeChat() {
    this.chatOpen.set(false);
  }

  protected sendChat(event: Event, input: HTMLInputElement) {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || this.chatTyping()) return;

    this.chatMessages.update((messages) => [
      ...messages,
      { id: this.nextChatMessageId++, sender: 'user', text },
    ]);
    input.value = '';
    this.chatTyping.set(true);

    window.setTimeout(() => {
      const sentMessages = this.chatMessages().filter((message) => message.sender === 'user').length;
      const response: ChatMessage = {
        id: this.nextChatMessageId++,
        sender: 'sofia',
        text: sentMessages >= 2
          ? 'Te dejo una miniatura... el resto lo guarde para quienes entran a mi club privado.'
          : 'Me gusta leerte. Contame, que te gustaria ver primero?',
        previewSrc: sentMessages >= 2 ? '/media/sofia-villa/photos/image4.jpg' : undefined,
      };
      this.chatMessages.update((messages) => [...messages, response]);
      this.chatTyping.set(false);
    }, 900);
  }

  protected goToVip() {
    this.closeChat();
    if (this.paymentState() === 'approved') {
      document.querySelector('.media-vault')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    document.getElementById('vip')?.scrollIntoView({ behavior: 'smooth' });
  }

  private showChatPrompt() {
    if (!this.chatOpen()) this.chatPrompt.set(true);
  }

  private async confirmPayment(reference: string) {
    this.paymentState.set('checking');
    this.paymentMessage.set('Estamos confirmando tu pago. Esto puede tardar unos segundos.');

    for (let attempt = 0; attempt < 15; attempt += 1) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/${encodeURIComponent(reference)}/status`);
        const payment = (await response.json()) as PaymentStatusResponse | { message?: string };

        if (!response.ok || !('status' in payment)) {
          throw new Error('No pudimos confirmar tu pago.');
        }
        if (payment.status === 'APPROVED' && payment.accessGranted) {
          sessionStorage.setItem('sofia-villa-vip-reference', reference);
          this.paymentState.set('approved');
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
        if (payment.status !== 'PENDING') {
          this.paymentMessage.set(payment.status === 'APPROVED' ? 'Tu membresia ya no esta activa.' : 'El pago no fue aprobado. Podes volver a intentarlo cuando quieras.');
          this.paymentState.set('failed');
          return;
        }
      } catch (error) {
        this.paymentMessage.set(error instanceof Error ? error.message : 'No pudimos confirmar tu pago.');
      }

      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }

    this.paymentMessage.set('Tu pago sigue en verificacion. Actualiza esta pagina en unos segundos.');
    this.paymentState.set('failed');
  }
}