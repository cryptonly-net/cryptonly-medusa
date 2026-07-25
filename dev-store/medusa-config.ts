import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  // MEDUSA_BACKEND_URL is the public webhook origin (ngrok). Pin Admin to same-origin
  // so login session cookies work at http://localhost:9000/app.
  admin: {
    backendUrl: process.env.MEDUSA_ADMIN_BACKEND_URL || "/",
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve:
              "@cryptonly/medusa-plugin-cryptonly/providers/cryptonly",
            id: "cryptonly",
            options: {
              apiKey: process.env.CRYPTONLY_API_KEY,
              accountId: process.env.CRYPTONLY_ACCOUNT_ID,
              webhookSigningKey: process.env.CRYPTONLY_WEBHOOK_SIGNING_KEY,
              sandbox: process.env.CRYPTONLY_SANDBOX !== "false",
              backendUrl: process.env.MEDUSA_BACKEND_URL,
              webhookUrl: process.env.CRYPTONLY_WEBHOOK_URL || undefined,
              returnUrl: process.env.CRYPTONLY_RETURN_URL || undefined,
            },
          },
        ],
      },
    },
  ],
})
