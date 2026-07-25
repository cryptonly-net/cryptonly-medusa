# Local Medusa test stand

Run a local Medusa v2 backend with `@cryptonly/medusa-plugin-cryptonly` linked via yalc, connected to the **Cryptonly sandbox** for end-to-end payment testing.

## Prerequisites

| Tool | Purpose |
|------|---------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Postgres (`docker compose`) |
| Node.js 20+ | plugin + Medusa app |
| [ngrok](https://ngrok.com/) (or similar) | Public HTTPS tunnel for local webhooks |

**Do not use `sudo npm install`.** It can corrupt optional native packages (Rollup/esbuild). If you see errors like `@rollup/rollup-darwin-arm64` or truncated `.node` binaries:

```bash
cd plugins/cryptonly-medusa   # plugin root
rm -rf node_modules package-lock.json
npm install --no-fund --no-audit
npm run env:setup
```

## Quick start

From the **plugin root** (`plugins/cryptonly-medusa`):

```bash
cp dev-store/.env.example dev-store/.env   # fill CRYPTONLY_* later
npm run env:setup
npm run env:dev          # terminal A — Medusa :9000
npm run env:storefront   # terminal B — Next.js :8000
```

Or from this folder:

```bash
cp .env.example .env
npm run setup
# then from plugin root:
npm run env:dev
npm run env:storefront
```

Default URLs:

| | URL |
|---|---|
| Admin | http://localhost:9000/app |
| API | http://localhost:9000 |
| Storefront | http://localhost:8000 |
| Login | `admin@cryptonly.local` / `supersecret` |
| Postgres | `localhost:5433` (user/pass/db: `medusa` / `medusa` / `cryptonly_medusa_dev`) |

## Sandbox account

1. Register at [sandbox-merchant.cryptonly.net](https://sandbox-merchant.cryptonly.net).
2. Collect:
   - **API key** — Settings → API Keys
   - **Account ID** — account UUID
   - **Webhook signing key** — Settings → Security
3. Paste into `dev-store/.env`, then restart `npm run env:dev`.

## Webhook tunnel (required)

Cryptonly rejects `http://localhost` for `webhookUrl` / `returnUrl`.

1. Start ngrok against the Medusa port:

```bash
ngrok http 9000
```

2. Point the harness at the HTTPS origin:

```bash
npm run env:tunnel -- https://YOUR_SUBDOMAIN.ngrok-free.app
# or: ./scripts/set-tunnel-url.sh https://YOUR_SUBDOMAIN.ngrok-free.app
```

3. Restart Medusa so the provider reloads options.

Keep using Admin/API on `http://localhost:9000`. Invoices will send webhooks to:

```
https://YOUR_SUBDOMAIN.ngrok-free.app/hooks/payment/cryptonly_cryptonly
```

## Day-to-day plugin development

Terminal A — watch / republish plugin:

```bash
# plugin root
npm run dev
# or after edits:
npm run env:link
```

Terminal B — Medusa app:

```bash
npm run env:dev
```

`env:link` rebuilds the plugin, `yalc publish`es it, and re-links it into `dev-store`.

## Test flow

- [ ] `npm run env:setup` completes (backend + storefront bootstrap)
- [ ] Admin login works
- [ ] Region **Europe** lists payment provider `pp_cryptonly_cryptonly`
- [ ] `CRYPTONLY_*` filled in `.env` + tunnel set
- [ ] `npm run env:dev` + `npm run env:storefront`
- [ ] Open http://localhost:8000 → add a product → checkout
- [ ] Select **Cryptonly (crypto)** → Continue → **Pay with Cryptonly**
- [ ] Pay on sandbox hosted page
- [ ] Webhook hits `/hooks/payment/cryptonly_cryptonly` → order updates in Admin

### Storefront

`env:setup` clones the [Medusa Next.js Starter](https://github.com/medusajs/nextjs-starter-medusa) into `../dev-storefront` (gitignored) and overlays Cryptonly checkout patches from `patches/storefront/`.

Checkout: initiate `pp_cryptonly_cryptonly` → redirect to `paymentPageUrl`.

Re-bootstrap only the storefront:

```bash
npm run env:storefront:bootstrap   # from plugin root
```

## Useful commands

| Command | What it does |
|---------|----------------|
| `npm run env:setup` | Postgres + install + yalc link + migrate + seed + admin user + storefront |
| `npm run env:dev` | `medusa develop` in `dev-store` (:9000) |
| `npm run env:storefront` | Next.js storefront (:8000) |
| `npm run env:storefront:bootstrap` | Re-clone/overlay storefront + refresh `.env.local` |
| `npm run env:link` | Rebuild plugin and re-link into the store |
| `npm run env:tunnel -- <https-url>` | Write tunnel URLs into `.env` |
| `npm run env:db:up` / `env:db:down` | Start/stop Postgres only |

## Tear down

```bash
npm run env:db:down
# remove DB volume:
cd dev-store && docker compose down -v
```
