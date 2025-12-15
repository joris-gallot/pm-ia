import process from 'node:process'
import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']),
  PG_USER: z.string(),
  PG_PASSWORD: z.string(),
  PG_HOST: z.string(),
  PG_PORT: z.coerce.number(),
  PG_DATABASE: z.string(),
  AUTH_SECRET: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  STRIPE_PRO_PLAN_PRICE_ID: z.string(),
  // AI Configuration
  AI_DEFAULT_PROVIDER: z.enum(['ollama', 'openai', 'anthropic']),
  // Ollama (local development)
  AI_OLLAMA_URL: z.string().optional(),
  AI_OLLAMA_CHAT_MODEL: z.string().optional(),
  AI_OLLAMA_EMBED_MODEL: z.string().optional(),
  // OpenAI (optional for now)
  AI_OPENAI_API_KEY: z.string().optional(),
  AI_OPENAI_CHAT_MODEL: z.string().optional(),
  AI_OPENAI_EMBED_MODEL: z.string().optional(),
  // Anthropic (optional for now)
  AI_ANTHROPIC_API_KEY: z.string().optional(),
  AI_ANTHROPIC_CHAT_MODEL: z.string().optional(),
})

export const env = envSchema.parse(process.env)

export const isDev = env.NODE_ENV === 'development'
export const isProd = env.NODE_ENV === 'production'
