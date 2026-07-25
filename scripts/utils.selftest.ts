import {
  buildCustomPayload,
  isPublicHttpsWebhookUrl,
  mapInvoiceToSessionStatus,
  normalizeCurrencyCode,
  parseSessionIdFromCustomPayload,
  toMajorAmount,
} from "../src/providers/cryptonly/utils"

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg)
  }
}

assert(toMajorAmount("12.50") === 12.5, "string amount")
assert(toMajorAmount(10) === 10, "number amount")
assert(normalizeCurrencyCode("usd") === "USD", "currency upper")
assert(buildCustomPayload("sess_1") === '{"session_id":"sess_1"}', "payload")
assert(
  parseSessionIdFromCustomPayload('{"session_id":"sess_1"}') === "sess_1",
  "parse payload"
)
assert(mapInvoiceToSessionStatus("paid") === "captured", "paid → captured")
assert(mapInvoiceToSessionStatus("overpaid") === "captured", "overpaid → captured")
assert(
  mapInvoiceToSessionStatus("partially_paid") === "error",
  "partially_paid → error"
)
assert(mapInvoiceToSessionStatus("created") === "pending", "created → pending")
assert(mapInvoiceToSessionStatus("cancelled") === "canceled", "cancelled → canceled")

assert(
  isPublicHttpsWebhookUrl("https://api.example.com/hooks/payment/cryptonly_cryptonly"),
  "https public host"
)
assert(
  isPublicHttpsWebhookUrl("https://goofy.ngrok-free.app/hooks/payment/cryptonly_cryptonly"),
  "ngrok host"
)
assert(!isPublicHttpsWebhookUrl("http://api.example.com/hooks"), "reject http")
assert(!isPublicHttpsWebhookUrl("https://localhost:9000/hooks"), "reject localhost")
assert(!isPublicHttpsWebhookUrl("https://127.0.0.1/hooks"), "reject loopback")
assert(!isPublicHttpsWebhookUrl("https://192.168.1.1/hooks"), "reject private ip")
assert(!isPublicHttpsWebhookUrl("not-a-url"), "reject garbage")

console.log("cryptonly provider utils: ok")
