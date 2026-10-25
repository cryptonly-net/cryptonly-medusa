export type CryptonlyPaymentOptions = {
  /**
   * Cryptonly API key (`x-tenant-api-key`). The key selects the account.
   */
  apiKey: string
  /**
   * Webhook signing key (64-char hex) from that account's Security settings.
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
*/
  backendUrl?: string
  /**
   * Full webhook URL override. When set, takes precedence over `backendUrl`.
   */
  webhookUrl?: string
  /**
   * Optional default return URL after cancel / expire on the hosted page
   * ("Return to {store name}" CTA for `created` / `cancelled` / `expired`).
   * Fallback only — prefer `data.returnUrl` on each payment session.
   */
  returnUrl?: string
  /**
   * Optional default success URL after paid / overpaid.
   * Fallback only — prefer `data.successUrl` on each payment session.
   */
  successUrl?: string
  /**
   * Optional default failed URL after failed / suspended / partially_paid.
   * Fallback only — prefer `data.failedUrl` on each payment session.
   */
  failedUrl?: string
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
  successUrl?: string
  failedUrl?: string
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
