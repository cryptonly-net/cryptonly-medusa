import type { BigNumberInput } from "@medusajs/framework/types"
import {
  InvoiceStatus,
  type Invoice,
  type InvoiceStatus as InvoiceStatusType,
} from "@cryptonly/sdk"
import type { PaymentSessionStatus } from "@medusajs/framework/types"

/**
 * Convert Medusa amount (major units) to a finite number for Cryptonly invoices.
 */
export function toMajorAmount(amount: BigNumberInput | number | string): number {
  if (typeof amount === "number") {
    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid payment amount: ${amount}`)
    }
    return amount
  }

  if (typeof amount === "string") {
    const n = Number(amount)
    if (!Number.isFinite(n)) {
      throw new Error(`Invalid payment amount: ${amount}`)
    }
    return n
  }

  if (amount && typeof amount === "object") {
    const record = amount as Record<string, unknown>
    const candidate =
      record.numeric !== undefined
        ? record.numeric
        : record.value !== undefined
          ? record.value
          : typeof (amount as { toString?: () => string }).toString === "function"
            ? (amount as { toString: () => string }).toString()
            : undefined

    if (candidate !== undefined) {
      const n = typeof candidate === "number" ? candidate : Number(candidate)
      if (!Number.isFinite(n)) {
        throw new Error(`Invalid payment amount: ${String(candidate)}`)
      }
      return n
    }
  }

  throw new Error(`Unsupported payment amount type: ${typeof amount}`)
}

export function normalizeCurrencyCode(code: string | undefined): string {
  const currency = (code || "").trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(
      `Invalid currency "${code ?? ""}": expected a 3-letter ISO code (e.g. "USD").`
    )
  }
  return currency
}

export function parseSessionIdFromCustomPayload(
  customPayload: string | undefined | null
): string | undefined {
  if (!customPayload) {
    return undefined
  }
  try {
    const parsed = JSON.parse(customPayload) as { session_id?: unknown }
    return typeof parsed.session_id === "string" ? parsed.session_id : undefined
  } catch {
    return undefined
  }
}

export function buildCustomPayload(sessionId: string): string {
  return JSON.stringify({ session_id: sessionId })
}

/**
 * Cryptonly rejects non-public webhook URLs. Mirror WooCommerce rules:
 * HTTPS only, hostname with a public TLD, no localhost / loopback / raw IPs.
 */
export function isPublicHttpsWebhookUrl(url: string): boolean {
  const trimmed = (url || "").trim()
  if (!trimmed) {
    return false
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:") {
    return false
  }

  const host = parsed.hostname.toLowerCase()
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return false
  }

  // Reject raw IPv4 / IPv6 hosts (Cryptonly expects a public hostname).
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    return false
  }

  // Require at least one dot and a 2+ letter TLD (e.g. example.com, *.ngrok-free.app).
  if (!/\.[a-z]{2,}$/i.test(host)) {
    return false
  }

  return true
}

export function mapInvoiceToSessionStatus(
  status: InvoiceStatusType
): PaymentSessionStatus {
  // Only fully paid / overpaid complete the Medusa payment.
  if (
    status === InvoiceStatus.PAID ||
    status === InvoiceStatus.OVERPAID
  ) {
    return "captured"
  }

  switch (status) {
    case InvoiceStatus.CANCELLED:
      return "canceled"
    case InvoiceStatus.FAILED:
    case InvoiceStatus.EXPIRED:
    case InvoiceStatus.SUSPENDED:
    case InvoiceStatus.PARTIALLY_PAID:
      return "error"
    case InvoiceStatus.PROCESSING:
    case InvoiceStatus.CREATED:
    default:
      return "pending"
  }
}

export function invoiceSnapshot(invoice: Invoice): Record<string, unknown> {
  return {
    invoiceId: invoice.id,
    orderId: invoice.orderId,
    paymentPageUrl: invoice.paymentPageUrl,
    status: invoice.status,
    amount: invoice.amount,
    currency: invoice.fiatCurrencyCode,
    accountId: invoice.accountId,
    cryptoCurrencyCode: invoice.cryptoCurrencyCode,
    cryptoAmountExpected: invoice.cryptoAmountExpected,
    cryptoAmountReceived: invoice.cryptoAmountReceived,
    txHash: invoice.txHash,
    expiresAt: invoice.expiresAt,
    paidAt: invoice.paidAt,
  }
}
