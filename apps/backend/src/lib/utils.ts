import { env } from './env.js'

export function getTrustedOrigins() {
  return env.NODE_ENV === 'production' ? ['https://app.com'] : ['http://localhost:3001']
}
