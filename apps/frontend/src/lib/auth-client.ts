import { stripeClient } from '@better-auth/stripe/client'
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'
import { BACKEND_URL } from './constants'

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [
    adminClient(),
    stripeClient({
      subscription: true,
    }),
  ],
})
