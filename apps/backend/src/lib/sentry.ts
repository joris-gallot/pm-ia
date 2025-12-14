import * as Sentry from '@sentry/node'
import { env } from './env.js'

if (env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://9fec0759ebe132899bcd5c08975c6d5c@o1155685.ingest.us.sentry.io/4510375418920960',
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    environment: 'production',
  })
}
