# AGENTS.md

Code and comments should be always in english. No documentation unless specified otherwise. No raw text in pages, use translations.

## Stack Overview

### Validation
- **Zod** - Schema validation and type safety

### Payments
- **Stripe** - Payment processing with better-auth integration
  - Documentation: https://www.better-auth.com/docs/plugins/stripe

## Frontend (`apps/frontend`)

### Core Technologies
- **Vue 3** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety

### Styling & UI
- **TailwindCSS** - Utility-first CSS framework
  - CSS files are in `src/assets/`
- **shadcn/ui** - Component library
  - Run `pnpm dlx shadcn-vue@latest add <component>` to add components
  
### Authentication
- **Better Auth** - Authentication solution

Client is set up in `src/lib/auth-client.ts`

Logged-in user info is available via `useAuthStore()` store, if you are in a logged in context, you can access the user like this `useAuthStore<true>()`, true indicates that the user is logged in.

### Authorization
- **Better Auth** - admin plugin

User can be assigned roles:
  - admin
  - user

### State & Utilities
- **VueUse** - Vue composition utilities

### Internationalization
- **vue-i18n** - Translations in `src/i18n/`

### Routing
- **Vue Router** - Client-side routing

Routes are defined in `src/router/index.ts`
Pages are defined in `src/views/`

### Notifications
- **Vue Sonner** - Toast notifications

### Layouts
Layouts are defined in `src/componentslayouts/`:
- AppLayout.vue - Main application layout
- AuthLayout.vue - Authentication pages layout

### Import from common
 As defined in tsconfig `"@common/*": ["../common/src/*"]`
 
### API Client
- **tRPC Client** - Type-safe API calls

### Data Fetching
Use `useAsyncState` from VueUse to fetch data asynchronously. Example:
```typescript
import { useAsyncState } from '@vueuse/core'
import { client } from '@/lib/trpc'

const { state } = useAsyncState(client.hello.world.query(), null)
```

## Backend (`apps/backend`)

### Core Technologies
- **Hono** - Web framework
- **tRPC** - Type-safe API layer
- **Drizzle ORM** - Database ORM

### Authentication
- **Better Auth** - Authentication solution

Config is in `src/lib/auth.ts`

### Environment Variables
- Defined in `.env` file at the root of the project
- Parsed at `src/lib/env.ts`

### Import from common
 As defined in tsconfig `"@common/*": ["../common/src/*"]`

## Common (`packages/common`)

### Purpose
- Share Zod schemas between frontend and backend
- Export types from backend to frontend (tRPC, Auth, etc.)

## Project Structure

```
apps/
  frontend/     - Vue application
    src/i18n/   - Translation files
  backend/      - Hono + tRPC API + Better Auth
packages/
  common/       - Shared schemas and types
```
