import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import { ValidateEnv } from '@julr/vite-plugin-validate-env'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { z } from 'zod'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    build: {
      sourcemap: true,
    },
    plugins: [
      vue(),
      tailwindcss(),
      ValidateEnv({
        validator: 'standard',
        schema: {
          VITE_BACKEND_URL: z.string(),
        },
      }),
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: 'joris-gallot',
        project: '<project-name>',
        sourcemaps: {
          // As you're enabling client source maps, you probably want to delete them after they're uploaded to Sentry.
          // Set the appropriate glob pattern for your output folder - some glob examples below:
          filesToDeleteAfterUpload: [
            './**/*.map',
            '.*/**/public/**/*.map',
            './dist/**/client/**/*.map',
          ],
        },
      }),
    ],
    server: {
      port: 3001,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@common': fileURLToPath(new URL('../common/src', import.meta.url)),
      },
    },
  }
})
