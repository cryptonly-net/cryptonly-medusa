<img src="https://raw.githubusercontent.com/cryptonly-net/.github/main/profile/assets/header-banner.svg" alt="Cryptonly" width="100%" />

# Cryptonly - Crypto payment provider for Medusa v2

`@cryptonly/medusa-plugin-cryptonly` lets Medusa v2 stores accept cryptocurrency payments via the [Cryptonly](https://cryptonly.net) hosted checkout.

Customers select Cryptonly at checkout, pay on the Cryptonly payment page, and return to your store. Payment status in Medusa updates automatically via signed webhooks.

## Requirements

- Medusa **v2.8+**
- Node **20+**
- Cryptonly merchant account — [merchant.cryptonly.net](https://merchant.cryptonly.net/)
- Public **HTTPS** backend URL reachable by Cryptonly webhooks

## Installation

```bash
npm install @cryptonly/medusa-plugin-cryptonly
```

## Configuration

In `medusa-config.ts`:

```ts
module.exports = defineConfig({
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@cryptonly/medusa-plugin-cryptonly/providers/cryptonly",
            id: "cryptonly",
            options: {
              apiKey: process.env.CRYPTONLY_API_KEY,
              accountId: process.env.CRYPTONLY_ACCOUNT_ID,
              webhookSigningKey: process.env.CRYPTONLY_WEBHOOK_SIGNING_KEY,
              sandbox: process.env.CRYPTONLY_SANDBOX === "true",
              backendUrl: process.env.MEDUSA_BACKEND_URL,
            },
          },
        ],
      },
    },
  ],
})
```

Keep provider `id: "cryptonly"` — the webhook path is `/hooks/payment/cryptonly_cryptonly` and Medusa resolves the provider as `pp_cryptonly_cryptonly`.

### Options

| Option | Required | Description |
|--------|----------|-------------|
| `apiKey` | yes | Tenant API key (Settings → Security → API keys) |
| `accountId` | yes | Cryptonly account UUID |
| `webhookSigningKey` | yes | Webhook signing key (verifies `x-webhook-signature`) |
| `backendUrl` | yes* | Public HTTPS origin; webhook URL becomes `{backendUrl}/hooks/payment/cryptonly_cryptonly` |
| `webhookUrl` | yes* | Full HTTPS webhook URL (overrides `backendUrl`) |
| `sandbox` | no | Use the sandbox merchant API (default: `false`) |
| `returnUrl` | no | Default post-payment return URL |
| `expiresInMinutes` | no | Invoice expiry passed to Cryptonly |

\* Provide either `backendUrl` or `webhookUrl`.

`apiKey`, `accountId`, and `webhookSigningKey` must be non-empty strings, otherwise the provider will not register.

For more on sandbox testing (simulate payment, test webhooks), see [Testing your integration](https://cryptonly.net/docs/guides/testing-your-integration).

### Environment variables

```bash
CRYPTONLY_API_KEY=...
CRYPTONLY_ACCOUNT_ID=...
CRYPTONLY_WEBHOOK_SIGNING_KEY=...
CRYPTONLY_SANDBOX=true
MEDUSA_BACKEND_URL=https://api.example.com
# Local tunnel override (optional):
# CRYPTONLY_WEBHOOK_URL=https://YOUR_SUBDOMAIN.ngrok-free.app/hooks/payment/cryptonly_cryptonly
```

## Checkout flow

1. Storefront initiates a payment session with provider id `pp_cryptonly_cryptonly`.
2. The session's `data.paymentPageUrl` is the Cryptonly hosted checkout URL — redirect the customer there.
3. After payment, Cryptonly POSTs to `{backend}/hooks/payment/cryptonly_cryptonly`.
4. The provider verifies the signature and marks the session captured on `paid` or `overpaid`.

## Storefront integration

After `initiatePaymentSession`, redirect the customer:

```ts
window.location.href = paymentSession.data.paymentPageUrl
```

Medusa doesn't ship checkout labels or icons for payment providers. On the Next.js starter, add Cryptonly to `paymentInfoMap` in `src/lib/constants.tsx` (same pattern as Stripe/PayPal):

```tsx
import Cryptonly from "@modules/common/icons/cryptonly"

pp_cryptonly_cryptonly: {
  title: "Cryptonly (crypto)",
  icon: <Cryptonly />,
},
```

Add a Cryptonly SVG icon at `src/modules/common/icons/cryptonly.tsx` — a ready-made one is available in `dev-store/patches/storefront/`.

## Development

A full local harness (Medusa + Docker Postgres + yalc-linked plugin + Next.js storefront) lives in `dev-store/`. See `dev-store/README.md` for setup and scripts.

## Limitations

- Refunds are not supported (v1)

## License

MIT
