import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import CryptonlyProviderService from "./service"

/**
 * Cryptonly payment module provider.
 * Identifier `cryptonly`; registered key is `pp_cryptonly_<id>` where `<id>`
 * is the provider id from medusa-config (prefer `cryptonly`).
 */
export default ModuleProvider(Modules.PAYMENT, {
  services: [CryptonlyProviderService],
})

export type {
  CryptonlyPaymentOptions,
  CryptonlyPaymentSessionData,
} from "./types"
export {
  CRYPTONLY_PROVIDER_IDENTIFIER,
  CRYPTONLY_DEFAULT_PROVIDER_CONFIG_ID,
  buildCryptonlyWebhookPath,
} from "./types"
export { isPublicHttpsWebhookUrl } from "./utils"
