import * as Sentry from '@sentry/vue'
import { configure } from 'vee-validate'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import en from './i18n/en.json' with { type: 'json' }
import { isProd } from './lib/environment'
import router from './router'
import './assets/main.css'

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
  },
})

configure({
  validateOnBlur: true,
  validateOnChange: false,
  validateOnModelUpdate: false,
  validateOnInput: false,
})

const app = createApp(App)

if (isProd()) {
  Sentry.init({
    app,
    dsn: 'https://9fec0759ebe132899bcd5c08975c6d5c@o1155685.ingest.us.sentry.io/4510375418920960',
    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/vue/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  })
}

app.use(router)
app.use(i18n)

app.mount('#app')
