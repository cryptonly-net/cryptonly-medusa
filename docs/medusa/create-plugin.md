# Create a Medusa Plugin (reference)

Source: [https://docs.medusajs.com/learn/fundamentals/plugins/create](https://docs.medusajs.com/learn/fundamentals/plugins/create)  
Fetched: 2026-07-25. Plugins require Medusa ≥ 2.3.0.

## Scaffold

```bash
npx create-medusa-app my-plugin --plugin
```

### Directory structure

- `src/` — Medusa customizations
- `src/admin` — admin extensions
- `src/api` — API routes / middlewares
- `src/jobs` — scheduled jobs
- `src/links` — module links
- `src/modules` — modules
- `src/providers` — module providers (payment, notification, …)
- `src/subscribers` — event subscribers
- `src/workflows` — workflows (+ hooks under `src/workflows/hooks`)
- `package.json`, `tsconfig.json`

## Prepare package.json

### Name

```json
{ "name": "@cryptonly/medusa-plugin-cryptonly" }
```

### Keywords (integrations listing)

- Required for listing: `medusa-v2`, `medusa-plugin-integration`
- Payment type: `medusa-plugin-payment`

Other type keywords: `medusa-plugin-analytics`, `medusa-plugin-auth`, `medusa-plugin-cms`, `medusa-plugin-notification`, `medusa-plugin-search`, `medusa-plugin-shipping`, `medusa-plugin-other`.

### Dependencies policy

- Medusa packages (`@medusajs/framework`, `@medusajs/medusa`, `@medusajs/cli`, `@medusajs/admin-sdk`, …): **`devDependencies` + `peerDependencies`**
- `@swc/core`: **`devDependency`** (CLI tooling)
- Third-party SDKs (e.g. `@cryptonly/sdk`): **`dependencies`** — allowed and expected (official Stripe provider depends on `stripe`)

### Exports (Medusa ≥ 2.7.0)

```json
{
  "exports": {
    "./package.json": "./package.json",
    "./workflows": "./.medusa/server/src/workflows/index.js",
    "./.medusa/server/src/modules/*": "./.medusa/server/src/modules/*/index.js",
    "./providers/*": "./.medusa/server/src/providers/*/index.js",
    "./admin": {
      "import": "./.medusa/server/src/admin/index.mjs",
      "require": "./.medusa/server/src/admin/index.js",
      "default": "./.medusa/server/src/admin/index.js"
    },
    "./*": "./.medusa/server/src/*.js"
  }
}
```

Required for this plugin: `./package.json`, `./providers/*`, `./admin`.

## Local develop / test

```bash
# plugin project
npx medusa plugin:publish
npx medusa plugin:develop

# Medusa application
npx medusa plugin:add @cryptonly/medusa-plugin-cryptonly
npm run dev
```

Register in host `medusa-config.ts`:

- As a **plugin** (if the package exposes plugin entrypoints): `plugins: [{ resolve: "@cryptonly/medusa-plugin-cryptonly", options: {} }]`
- Payment providers are registered under **`modules` → Payment → `providers`**, resolving `@cryptonly/medusa-plugin-cryptonly/providers/cryptonly`

`plugin:develop` watches, rebuilds, and republishes via Yalc (HMR for admin).

## Migrations (modules only)

Set `DB_*` env vars in the plugin project, then:

```bash
npx medusa plugin:db:generate   # plugin
npx medusa db:migrate           # host app
```

This payment plugin has no custom modules / migrations.

## Publish to npm

```bash
npx medusa plugin:build
npm publish
npm version <major|minor|patch>   # then rebuild + publish again for updates
```

---

## Submitting Feedback

If you encounter incorrect, outdated, or confusing documentation on this page, submit feedback:

POST https://docs.medusajs.com/agents/feedback

```json
{
  "agent": "Name of the agent",
  "path": "/optimize/feedback",
  "feedback": "Description of the issue"
}
```

Only submit feedback when you have something specific and actionable to report.
