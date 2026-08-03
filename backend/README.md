# Sofia Villa Payments API

Backend NestJS for the Sofia Villa VIP checkout. It uses **Wompi Web Checkout** so the site never receives card, PSE, or Nequi credentials. The checkout session is signed on the server, and access is only activated from a verified Wompi webhook.

## Why this flow

- The hosted Wompi checkout can expose Nequi, PSE, and card methods enabled for the merchant.
- The price is server-owned (`29.900 COP` / 30 days); the browser cannot alter it because Wompi checks the integrity signature.
- A signed webhook validates the final state before the membership is extended.
- Checkout references are random and single-use. A payment is never granted merely from the browser redirect.

## Start locally

1. Copy `.env.example` to `.env` and replace the Wompi sandbox values with values from the Wompi merchant dashboard.
2. Start PostgreSQL: `docker compose up -d`.
3. Install packages: `npm install`.
4. Start the API: `npm run start:dev`.
5. Start the Angular app from the repository root with `npm start`.

The API is at `http://localhost:3000/api`. The Angular dev server proxy forwards `/api` to this address.

## Wompi dashboard configuration

- Register webhook URL: `https://YOUR_API_DOMAIN/api/webhooks/wompi`.
- Configure it independently for sandbox and production.
- Set `PAYMENT_REDIRECT_URL` to the public URL of the frontend.
- Keep `WOMPI_INTEGRITY_SECRET` and `WOMPI_EVENTS_SECRET` only on the server/secret manager. Never put them in Angular or git.

## Endpoints

- `POST /api/payments/checkout-sessions` — body: `{ "email": "member@example.com", "planCode": "vip-monthly" }`. Returns the hosted Wompi checkout form configuration.
- `POST /api/webhooks/wompi` — Wompi callback. The SHA-256 checksum is validated before changing access.
- `GET /api/payments/:reference/status` — temporary checkout status endpoint. Protect this with user authentication before exposing private member data.
- `GET /api/health` — health check.

## Production checklist

- Confirm in writing that Wompi accepts the merchant category and that `Sofía Villa` is the visible commercial descriptor.
- Use a legal merchant account and HTTPS domain.
- Deploy PostgreSQL with backups; the local Docker service is development-only.
- Add account authentication before serving protected media; do not place paid material under Angular `public/`.
- Do not treat the 18+ modal as legal age verification. Add the required legal/compliance flow for your launch jurisdiction.

## Membership model

This implementation creates a 30-day membership after an **approved** payment. It intentionally uses a new hosted checkout each month: this is broadly accessible because each renewal can use Nequi, PSE, or card methods that the merchant enables. Automatic charges require separate provider approval, customer consent, and an account/authentication lifecycle; do not activate them until the provider confirms the supported method for this merchant.

