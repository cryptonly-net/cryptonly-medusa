<img src="https://raw.githubusercontent.com/cryptonly-net/.github/main/profile/assets/header-banner.svg" alt="Cryptonly" width="100%" />

<div align="center">

# Cryptonly — Crypto payments for Medusa v2

Accept Bitcoin, Ethereum, stablecoins, and more in your Medusa store.

[Website](https://cryptonly.net) · [Documentation](https://cryptonly.gitbook.io/docs/integration/cms-plugins/medusa) · [Contact](https://cryptonly.net/contact/)

</div>

---

[`@cryptonly/medusa-plugin-cryptonly`](https://www.npmjs.com/package/@cryptonly/medusa-plugin-cryptonly) adds crypto payments to Medusa v2 via Cryptonly's hosted checkout.

Customers pay on a secure Cryptonly page and return to your store. You keep pricing in fiat. Payment status updates automatically via signed webhooks - no manual matching, no chargebacks.

## Features

- **Hosted checkout** — no crypto UI to build, customers pay on Cryptonly's page
- **Signed webhooks** — payments capture automatically when paid
- **Fiat pricing** — price products in USD/EUR, crypto amounts calculated at checkout
- **Sandbox mode** — test the full flow before going live
- **0.5% per transaction** — no setup fee, no monthly fee

## Quick start

```bash
npm install @cryptonly/medusa-plugin-cryptonly
```

Register the provider in `medusa-config.ts`:

```ts
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
}
```

Then enable Cryptonly on a region in Medusa Admin — done.

📘 Full setup (webhooks, storefront, testing): **[Medusa integration guide](https://cryptonly.gitbook.io/docs/integration/cms-plugins/medusa)**

🔑 Get your API keys: **[merchant.cryptonly.net](https://merchant.cryptonly.net/)**

## Requirements

- Medusa v2.8+ 
- Node 20+
- Cryptonly merchant account

## Support

- 📧 [support@cryptonly.net](mailto:support@cryptonly.net)
- 💬 [cryptonly.net/contact](https://cryptonly.net/contact)
- 💼 [LinkedIn](https://www.linkedin.com/company/cryptonly)

## License

MIT