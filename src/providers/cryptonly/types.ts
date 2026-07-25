export type CryptonlyPaymentOptions = {
  /**
   * Cryptonly tenant API key (`x-tenant-api-key`).
   */
  apiKey: string
  /**
   * Cryptonly account UUID used when creating invoices.
   */
  accountId: string
  /**
   * Webhook signing key (64-char hex) used to verify `x-webhook-signature`.
   */
  webhookSigningKey: string
  /**
   * When true, use Cryptonly sandbox merchant API.
   * @default false
   */
  sandbox?: boolean
  /**
   * Public Medusa backend origin (no trailing slash), used to build the
   * invoice `webhookUrl` as `{backendUrl}/hooks/payment/cryptonly_cryptonly`
   * (no `pp_` prefix — Medusa adds it when resolving the provider).
   * Prefer setting provider `id: "cryptonly"` in medusa-config so this path matches.
   */
  backendUrl?: string
  /**
   * Full webhook URL override. When set, takes precedence over `backendUrl`.
   * Must be a public HTTPS URL Cryptonly can reach.
   */
  webhookUrl?: string
  /**
   * Optional default return URL after the customer finishes on the hosted page.
   * Can also be passed per session via `data.returnUrl`.
   */
  returnUrl?: string
  /**
   * Optional invoice expiry in minutes (Cryptonly API).
   */
  expiresInMinutes?: number
}

/** Session `data` shape stored on the Medusa payment session. */
export type CryptonlyPaymentSessionData = {
  session_id?: string
  invoiceId?: string
  orderId?: string
  paymentPageUrl?: string
  status?: string
  amount?: number
  currency?: string
  accountId?: string
  returnUrl?: string
  [key: string]: unknown
}

export const CRYPTONLY_PROVIDER_IDENTIFIER = "cryptonly"

/** Default Medusa config provider `id` — keep in sync with webhook path docs. */
export const CRYPTONLY_DEFAULT_PROVIDER_CONFIG_ID = "cryptonly"

export function buildCryptonlyWebhookPath(
  providerConfigId: string = CRYPTONLY_DEFAULT_PROVIDER_CONFIG_ID
): string {
  // Medusa route is /hooks/payment/{provider}; it then resolves pp_{provider}.
  // So the path segment must be `{identifier}_{id}` WITHOUT the `pp_` prefix
  // (e.g. cryptonly_cryptonly → container key pp_cryptonly_cryptonly).
  return `/hooks/payment/${CRYPTONLY_PROVIDER_IDENTIFIER}_${providerConfigId}`
}
