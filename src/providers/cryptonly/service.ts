import {
  Cryptonly,
  InvoiceStatus,
  verifyInvoiceWebhook,
  type Invoice,
} from "@cryptonly/sdk"
import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import {
  buildCryptonlyWebhookPath,
  CRYPTONLY_DEFAULT_PROVIDER_CONFIG_ID,
  CRYPTONLY_PROVIDER_IDENTIFIER,
  type CryptonlyPaymentOptions,
  type CryptonlyPaymentSessionData,
} from "./types"
import {
  buildCustomPayload,
  invoiceSnapshot,
  isPublicHttpsWebhookUrl,
  mapInvoiceToSessionStatus,
  normalizeCurrencyCode,
  parseSessionIdFromCustomPayload,
  toMajorAmount,
} from "./utils"

type InjectedDependencies = {
  logger: Logger
}

/**
 * Cryptonly hosted crypto checkout for Medusa v2.
 *
 * Provider identifier: `cryptonly` → registered as `pp_cryptonly_<id>`.
 * Prefer `id: "cryptonly"` in medusa-config so the webhook path is
 * `/hooks/payment/cryptonly_cryptonly` (Medusa prepends `pp_` when resolving).
 *
 * Flow:
 * 1. `initiatePayment` creates a Cryptonly invoice and returns `paymentPageUrl`
 * 2. Storefront redirects the customer to the hosted payment page
 * 3. Cart complete calls `authorizePayment` → usually `pending` until paid
 * 4. Cryptonly webhook hits Medusa `/hooks/payment/...` → `getWebhookActionAndData`
 *    returns `captured` when the invoice is fully paid or overpaid
 *    (`partially_paid` maps to failed)
 */
class CryptonlyProviderService extends AbstractPaymentProvider<CryptonlyPaymentOptions> {
  static identifier = CRYPTONLY_PROVIDER_IDENTIFIER

  protected readonly logger_: Logger
  protected readonly options_: CryptonlyPaymentOptions
  protected readonly client_: Cryptonly

  constructor(container: InjectedDependencies, options: CryptonlyPaymentOptions) {
    super(container as unknown as Record<string, unknown>, options)
    this.logger_ = container.logger
    this.options_ = options || ({} as CryptonlyPaymentOptions)

    if (!this.options_.apiKey) {
      this.logger_.warn(
        "[cryptonly] provider registered without apiKey — set options before taking payments."
      )
    }

    this.client_ = new Cryptonly({
      apiKey: this.options_.apiKey || "",
      sandbox: Boolean(this.options_.sandbox),
    })
  }

  static validateOptions(options: Record<string, unknown>): void {
    for (const key of ["apiKey", "accountId", "webhookSigningKey"] as const) {
      const value = options[key]
      if (typeof value !== "string" || value.trim().length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Cryptonly payment provider option "${key}" is required and must be a non-empty string.`
        )
      }
    }

    const webhookUrl =
      typeof options.webhookUrl === "string" ? options.webhookUrl.trim() : ""
    const backendUrl =
      typeof options.backendUrl === "string" ? options.backendUrl.trim() : ""

    if (!webhookUrl && !backendUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Cryptonly payment provider requires "webhookUrl" or "backendUrl" so invoices can receive status webhooks.'
      )
    }

    const resolved = webhookUrl
      ? webhookUrl
      : `${backendUrl.replace(/\/$/, "")}${buildCryptonlyWebhookPath(
          CRYPTONLY_DEFAULT_PROVIDER_CONFIG_ID
        )}`

    if (!isPublicHttpsWebhookUrl(resolved)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Cryptonly webhook URL must be a public https:// hostname (not localhost or a raw IP). Set webhookUrl or backendUrl accordingly.'
      )
    }
  }

  private requireCredentials(): void {
    if (
      !this.options_.apiKey?.trim() ||
      !this.options_.accountId?.trim() ||
      !this.options_.webhookSigningKey?.trim()
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cryptonly payment provider is missing apiKey, accountId, or webhookSigningKey."
      )
    }
  }

  private resolveWebhookUrl(): string {
    let url = this.options_.webhookUrl
    if (!url) {
      const base = (this.options_.backendUrl || "").replace(/\/$/, "")
      if (!base) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cryptonly webhookUrl/backendUrl is not configured."
        )
      }
      url = `${base}${buildCryptonlyWebhookPath(CRYPTONLY_DEFAULT_PROVIDER_CONFIG_ID)}`
    }

    if (!isPublicHttpsWebhookUrl(url)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cryptonly webhookUrl must be a public https:// hostname (not localhost or a raw IP). Use a tunnel (e.g. ngrok) and set CRYPTONLY_WEBHOOK_URL or MEDUSA_BACKEND_URL."
      )
    }

    return url
  }

  private sessionIdFromInput(
    data: Record<string, unknown> | undefined
  ): string | undefined {
    const fromData = data?.session_id
    return typeof fromData === "string" && fromData.length > 0
      ? fromData
      : undefined
  }

  private async fetchInvoice(data: CryptonlyPaymentSessionData): Promise<Invoice> {
    this.requireCredentials()
    const invoiceId = data.invoiceId
    const orderId = data.orderId
    if (!invoiceId && !orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cryptonly payment session is missing invoiceId/orderId."
      )
    }
    return this.client_.invoice.get({
      accountId: this.options_.accountId,
      id: invoiceId,
      orderId,
    })
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    this.requireCredentials()

    const amount = toMajorAmount(input.amount)
    const currency = normalizeCurrencyCode(input.currency_code)
    const sessionId = this.sessionIdFromInput(input.data as Record<string, unknown>)
    const orderId =
      (typeof input.data?.orderId === "string" && input.data.orderId) ||
      sessionId ||
      undefined

    const returnUrl =
      (typeof input.data?.returnUrl === "string" && input.data.returnUrl) ||
      this.options_.returnUrl

    const invoice = await this.client_.invoice.create({
      accountId: this.options_.accountId,
      amount,
      fiatCurrencyCode: currency,
      orderId,
      description:
        (typeof input.data?.description === "string" && input.data.description) ||
        undefined,
      number:
        (typeof input.data?.number === "string" && input.data.number) || undefined,
      webhookUrl: this.resolveWebhookUrl(),
      returnUrl,
      expiresInMinutes: this.options_.expiresInMinutes,
      customPayload: sessionId ? buildCustomPayload(sessionId) : undefined,
    })

    const data: CryptonlyPaymentSessionData = {
      ...(input.data as CryptonlyPaymentSessionData),
      session_id: sessionId,
      invoiceId: invoice.id,
      orderId: invoice.orderId || orderId,
      paymentPageUrl: invoice.paymentPageUrl,
      status: invoice.status,
      amount,
      currency,
      accountId: invoice.accountId,
      returnUrl,
    }

    return {
      id: invoice.id,
      status: "pending",
      data,
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const data = (input.data || {}) as CryptonlyPaymentSessionData
    if (!data.invoiceId && !data.orderId) {
      return { status: "error", data }
    }

    try {
      const invoice = await this.fetchInvoice(data)
      const status = mapInvoiceToSessionStatus(invoice.status)
      return {
        status,
        data: {
          ...data,
          ...invoiceSnapshot(invoice),
          session_id: data.session_id,
        },
      }
    } catch (e) {
      this.logger_.error(
        `[cryptonly] authorizePayment failed: ${(e as Error).message}`
      )
      return { status: "pending", data }
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = (input.data || {}) as CryptonlyPaymentSessionData
    if (!data.invoiceId && !data.orderId) {
      return { status: "pending", data }
    }

    try {
      const invoice = await this.fetchInvoice(data)
      return {
        status: mapInvoiceToSessionStatus(invoice.status),
        data: {
          ...data,
          ...invoiceSnapshot(invoice),
          session_id: data.session_id,
        },
      }
    } catch (e) {
      this.logger_.error(
        `[cryptonly] getPaymentStatus failed: ${(e as Error).message}`
      )
      return { status: "pending", data }
    }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    // Crypto settlement is final on-chain; Medusa capture confirms local state.
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const data = (input.data || {}) as CryptonlyPaymentSessionData
    if (!data.invoiceId && !data.orderId) {
      return { data }
    }

    try {
      await this.client_.invoice.cancel({
        accountId: this.options_.accountId,
        id: data.invoiceId,
        orderId: data.orderId,
      })
      return {
        data: {
          ...data,
          status: InvoiceStatus.CANCELLED,
        },
      }
    } catch (e) {
      this.logger_.warn(
        `[cryptonly] cancelPayment: ${(e as Error).message}`
      )
      return { data }
    }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input)
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cryptonly invoices cannot be refunded through the Medusa payment provider. Handle refunds manually in Cryptonly if needed."
    )
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const data = (input.data || {}) as CryptonlyPaymentSessionData
    if (!data.invoiceId && !data.orderId) {
      return { data }
    }

    try {
      const invoice = await this.fetchInvoice(data)
      return {
        data: {
          ...data,
          ...invoiceSnapshot(invoice),
          session_id: data.session_id,
        },
      }
    } catch (e) {
      this.logger_.error(
        `[cryptonly] retrievePayment failed: ${(e as Error).message}`
      )
      return { data }
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    const data = (input.data || {}) as CryptonlyPaymentSessionData
    const nextAmount = toMajorAmount(input.amount)
    const nextCurrency = normalizeCurrencyCode(input.currency_code)

    if (
      data.invoiceId &&
      data.amount === nextAmount &&
      data.currency === nextCurrency
    ) {
      return { status: "pending", data }
    }

    // Amount/currency changed — cancel previous invoice when possible, then recreate.
    if (data.invoiceId || data.orderId) {
      try {
        await this.client_.invoice.cancel({
          accountId: this.options_.accountId,
          id: data.invoiceId,
          orderId: data.orderId,
        })
      } catch (e) {
        this.logger_.warn(
          `[cryptonly] updatePayment cancel previous: ${(e as Error).message}`
        )
      }
    }

    const recreated = await this.initiatePayment({
      ...input,
      data: {
        ...data,
        // Force a new orderId so Cryptonly does not treat this as the same invoice.
        orderId: data.session_id
          ? `${data.session_id}_${Date.now()}`
          : undefined,
      },
    })

    return {
      status: recreated.status,
      data: recreated.data,
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const headers = (payload.headers || {}) as Record<
      string,
      string | string[] | undefined
    >
    const signatureHeader = headerValue(headers, "x-webhook-signature")

    const raw = payload.rawData as unknown
    let rawBody: string | Buffer = ""
    if (Buffer.isBuffer(raw)) {
      rawBody = raw
    } else if (typeof raw === "string") {
      rawBody = raw
    } else if (raw && typeof raw === "object") {
      // Last resort: re-serialize parsed body (prefer raw bytes when Medusa provides them).
      rawBody = JSON.stringify(payload.data ?? raw)
    }

    const verification = verifyInvoiceWebhook(
      rawBody,
      signatureHeader,
      this.options_.webhookSigningKey || ""
    )

    if (!verification.ok) {
      this.logger_.warn(
        `[cryptonly] webhook not verified (${verification.reason}): ignoring.`
      )
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const invoice = verification.envelope.data
    const sessionId =
      parseSessionIdFromCustomPayload(invoice.customPayload) ||
      (typeof invoice.orderId === "string" ? invoice.orderId : undefined)

    if (!sessionId) {
      this.logger_.warn(
        "[cryptonly] webhook missing session_id (customPayload/orderId): cannot map to Medusa session."
      )
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const amount = new BigNumber(invoice.amount)

    if (
      invoice.status === InvoiceStatus.PAID ||
      invoice.status === InvoiceStatus.OVERPAID
    ) {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return {
        action: PaymentActions.CANCELED,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    }

    if (
      invoice.status === InvoiceStatus.FAILED ||
      invoice.status === InvoiceStatus.EXPIRED ||
      invoice.status === InvoiceStatus.SUSPENDED ||
      invoice.status === InvoiceStatus.PARTIALLY_PAID
    ) {
      return {
        action: PaymentActions.FAILED,
        data: {
          session_id: sessionId,
          amount,
        },
      }
    }

    // created / processing — acknowledge but do not complete payment yet
    this.logger_.info(
      `[cryptonly] webhook status=${invoice.status} for session ${sessionId}: pending.`
    )
    return {
      action: PaymentActions.PENDING,
      data: {
        session_id: sessionId,
        amount,
      },
    }
  }
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const lower = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      if (Array.isArray(value)) {
        return value[0]
      }
      return value
    }
  }
  return undefined
}

export default CryptonlyProviderService
