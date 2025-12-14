import type { Merge } from 'type-fest'
import { stripe } from '@better-auth/stripe'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { db } from '../db/index.js'
import { env } from './env.js'
import { stripe as stripeClient } from './stripe.js'
import { getTrustedOrigins } from './utils.js'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  trustedOrigins: getTrustedOrigins(),
  emailAndPassword: {
    enabled: true,
  },
  secret: env.AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    admin(),
    stripe({
      stripeClient,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: 'pro',
            priceId: env.STRIPE_PRO_PLAN_PRICE_ID,
            limits: {
              // Define your plan limits here if needed
            },
          },
        ],
      },
    }),
  ],
})

export interface AuthType {
  user: (Merge<typeof auth.$Infer.Session.user, { role: 'user' | 'admin' }>) | null
  session: typeof auth.$Infer.Session.session | null
}
