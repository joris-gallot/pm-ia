# app template

## Stack
- **Backend**: Hono, tRPC, Drizzle ORM, Better Auth (session via cookie), Stripe
- **Frontend**: Vue 3, VueUse, TailwindCSS, shadcn-vue, Lucide icons, Vee Validate
- **Validation**: Zod
- **Utils**: es-toolkit
- **Errors monitoring**: Sentry

## Features
- **Authentication**: Email/password + Google OAuth (Better Auth)
- **Authorization**: Role-based (user/admin) via Better Auth admin plugin
- **Billing**: Stripe subscriptions via Better Auth Stripe plugin
- **Admin Dashboard**: User management (CRUD, roles, ban, sessions) via Better Auth admin plugin
- **Layouts**: Auth layout (signin/signup) + App layout (sidebar)
- **Route Guards**: Centralized permission system

## Setup
```
docker compose up -d
nvm use
pnpm install
```

### Backend
```
cd apps/backend
cp .env.example .env
pnpm db:push
pnpm dev
```

### Frontend
```
cd apps/frontend
cp .env.example .env
pnpm dev
```

```
open http://localhost:3001
```

## Secrets for Github actions
- SENTRY_AUTH_TOKEN: Sentry auth token for sourcemaps uploading
- DOKPLOY_API_KEY: Dokploy API key for deployment
- DOKPLOY_BACKEND_APP_ID: Dokploy backend app ID
- Postgres connection info for migrations:
  - PG_HOST: Postgres host
  - PG_PORT: Postgres port
  - PG_USER: Postgres user
  - PG_PASSWORD: Postgres password
  - PG_DATABASE: Postgres database name

## How to

### How to add components from shadcn/ui

```
pnpm dlx shadcn-vue@latest add <component> -c apps/frontend
# E.g.
# pnpm dlx shadcn-vue@latest add button -c apps/frontend
```

### How to test subscriptions with stripe
1. Navigate to the Billing page
2. Click "Subscribe to Pro"
3. Use a [Stripe test card](https://stripe.com/docs/testing):
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
