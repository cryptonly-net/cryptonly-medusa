# Payment Module Provider (reference)

Source: [https://docs.medusajs.com/resources/references/payment/provider](https://docs.medusajs.com/resources/references/payment/provider)  
Fetched: 2026-07-25. Example upstream: [Stripe payment provider](https://github.com/medusajs/medusa/tree/develop/packages/modules/providers/payment-stripe).

## Location in a plugin

Create under `src/providers/<name>/` (not `src/modules/` when shipping inside a plugin).

Export via `ModuleProvider(Modules.PAYMENT, { services: [...] })` in `index.ts`.

Host registration:

```ts
modules: [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@cryptonly/medusa-plugin-cryptonly/providers/cryptonly",
          id: "cryptonly",
          options: {
            /* provider options */
          },
        },
      ],
    },
  },
],
```

Provider id stored as `pp_{identifier}_{id}` (e.g. `pp_cryptonly_cryptonly`).

Webhook URL (built-in Medusa route):

`{MEDUSA_BACKEND_URL}/hooks/payment/cryptonly_cryptonly`

## Service contract

Extend `AbstractPaymentProvider` from `@medusajs/framework/utils`.

| Method | Role for Cryptonly |
|--------|--------------------|
| `initiatePayment` | Create Cryptonly invoice; return `paymentPageUrl` in session `data` |
| `authorizePayment` | Async crypto: return `pending` / `pending_authorization` until settled; then `captured` |
| `getPaymentStatus` | Poll invoice status via SDK |
| `capturePayment` | No-op confirm (on-chain settle is the capture) |
| `cancelPayment` / `deletePayment` | Cancel invoice when possible |
| `refundPayment` | Not supported |
| `updatePayment` | Recreate invoice if amount/currency changed |
| `retrievePayment` | Refresh invoice snapshot into `data` |
| `getWebhookActionAndData` | Verify signature; map settled statuses → `captured` with Medusa `session_id` |

### Async / deferred authorization

For hosted / delayed methods, return status `pending` or `pending_authorization` from `authorizePayment` so the cart can complete with awaiting payment. Confirm later via webhook (`getWebhookActionAndData`) or a later authorize/status call.

### Session id

Medusa payment webhooks require `data.session_id` (the Medusa payment session id). Store it on the third-party object at `initiatePayment` (Cryptonly: `customPayload` JSON + prefer stable `orderId`).

### Webhook payload shape

```ts
payload: {
  data: Record<string, unknown>   // parsed body
  rawData: string | Buffer        // exact bytes for HMAC
  headers: Record<string, unknown>
}
```

Return e.g. `{ action: "captured", data: { session_id, amount: BigNumber } }` or `{ action: "not_supported" }`.

## Official dependency precedent

`@medusajs/payment-stripe` declares `"stripe"` under **`dependencies`**. Third-party SDKs in payment providers are allowed.
