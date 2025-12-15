import { isProd } from './env.js'

export function getTrustedOrigins() {
  return isProd ? ['https://app.com'] : ['http://localhost:3001']
}
