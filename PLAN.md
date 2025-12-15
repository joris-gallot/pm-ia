# PROJECT PLAN - AI-Assisted Product Management SaaS

## Overview

SaaS application for product management based on hierarchical **Context Spaces**, each with a **dedicated AI assistant**, with global orchestration capability. The application must be **fully functional without external integrations**.

---

## Template Already in Place

The project is based on a **complete template** that already includes:

### ✅ Backend
- **Hono** + **tRPC** (with logging + Sentry middleware)
- **Drizzle ORM** with migrations
- **Better Auth** (email/password + Google OAuth)
- **Better Auth Admin Plugin** (user/admin roles via `user.role`)
- **Better Auth Stripe Plugin** (subscriptions already configured)
- Existing tables: `user`, `session`, `account`, `verification`, `subscription`
- Procedures: `authProcedure`, `publicProcedure`
- Context: `user`, `req` available
- Stripe service: `fetchSubscriptionStatus`

### ✅ Frontend
- **Vue 3** + **TypeScript** + **TailwindCSS** + **shadcn-vue**
- **Vue Router** with guards system (`canAccessRoute`)
- **VueUse** + **vue-i18n**
- **Layouts**: `AppLayout` (with sidebar), `AuthLayout`
- **Store**: `useAuthStore` (with user info + subscription)
- Existing pages: Home, Account, Billing, Signin, Signup, AdminDashboard, Error404
- Components: AppSidebar, NavUser, UserAvatar, ProfileForm, OAuthSignIn

### ✅ Common
- Export backend types to frontend (`AppRouter`, `AuthType`)
- Shared Zod schemas (e.g., `updateUserSchema`)

### 📁 Structure
- **Monorepo** pnpm workspaces
- **Schemas**: EVERYTHING in `apps/backend/src/db/schema.ts` (no separate files)
- **Migrations**: via `drizzle-kit` (dev: `db:push`, prod: `migrate`)

---

## Technical Architecture

### Stack (already configured)
- **Frontend**: Vue 3 + TypeScript + TailwindCSS + shadcn-vue + vue-i18n
- **Backend**: Hono + tRPC + Drizzle ORM + Better Auth
- **Auth**: Better Auth (email/password + Google OAuth + admin plugin + Stripe plugin)
- **AI**: To be added - LLM API (OpenAI/Anthropic) + RAG
- **Database**: PostgreSQL (Docker Compose)
- **Validation**: Zod (schemas shared via `@common`)
- **Monitoring**: Sentry

---

## Phase 1 - Foundation & Core (Week 1-2)

### 1.1 Database Schema

#### Main Tables

**organizations**
```typescript
export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subscriptionId: text('subscription_id').references(() => subscription.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
```

**organization_members**
```typescript
export const organizationMember = pgTable(
  'organization_member',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'admin' | 'manager' | 'member'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('organization_member_userId_idx').on(table.userId),
    index('organization_member_organizationId_idx').on(table.organizationId),
  ],
)
```

**context_spaces**
```typescript
export const contextSpace = pgTable(
  'context_space',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    parentId: text('parent_id').references(() => contextSpace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type'), // 'product', 'app', 'project', 'feature', etc.
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('context_space_organizationId_idx').on(table.organizationId),
    index('context_space_parentId_idx').on(table.parentId),
  ],
)
```



**feature_requests**
```typescript
export const featureRequest = pgTable(
  'feature_request',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id')
      .notNull()
      .references(() => contextSpace.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    source: text('source').notNull().default('manual'), // 'manual' | 'imported'
    tags: text('tags').array(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('feature_request_contextSpaceId_idx').on(table.contextSpaceId),
  ],
)
```

### 1.2 Backend - Drizzle Schema

**Important**: The template already uses:
- Table `user` (Better Auth) - id, name, email, role, stripeCustomerId, etc.
- Table `subscription` (Better Auth Stripe) - id, plan, stripeSubscriptionId, status, etc.
- Pattern: EVERYTHING in `apps/backend/src/db/schema.ts` (single file)

**Tasks**:
- [ ] Add to `apps/backend/src/db/schema.ts`:
  - `organization` table (with ref to `subscription.id`)
  - `organizationMember` table (with ref to `user.id`, roles: admin/manager/member)
  - `contextSpace` table (with refs)
  - `featureRequest` table
- [ ] Add Drizzle relations (existing pattern):
  - `organizationRelations`
  - `contextSpaceRelations`
  - `featureRequestRelations`
- [ ] Dev: `pnpm --filter backend db:push` (push schema without migration)
- [ ] Prod: Generate migration with `pnpm drizzle-kit generate` then `pnpm --filter backend migrate`

### 1.3 Backend - tRPC Routers

**Existing structure**:
```
apps/backend/src/router/
├── index.ts              # appRouter (already exported to common)
└── user.ts               # userRouter (me, update)
```

**To create**:
```
apps/backend/src/router/
├── organization.ts       # CRUD organizations
├── context-space.ts      # CRUD context spaces + hierarchy
├── feature-request.ts    # CRUD feature requests
└── member.ts             # Member management (org + context spaces)
```

**Pattern to follow** (see `user.ts`):
- Use `authProcedure` for protected routes
- Use `publicProcedure` for public routes
- Available context: `ctx.user`, `ctx.req`
- Zod schemas from `@common/schemas/...`

**Tasks**:
- [ ] Router `organization` with procedures:
  - `getCurrent` - Get current user's organization
  - `update` - Update organization (admin only)
  - `getMembers` - List organization members
  - `inviteMember` - Invite user (admin only)
  - `removeMember` - Remove member (admin only)
  - `updateMemberRole` - Change member role (admin only)
  - `initializeForUser` - Auto-create org for new user

- [ ] Router `contextSpace` with procedures:
  - `list` - List accessible context spaces (with filters)
  - `getById` - Get context space details + permissions
  - `getTree` - Get hierarchical tree
  - `create` - Create new context space
  - `update` - Update context space
  - `delete` - Delete context space (cascade check)
  - `getChildren` - Get direct children
  - `getAncestors` - Get parent chain

- [ ] Router `featureRequest` with procedures:
  - `list` - List feature requests (filtered by context space)
  - `getById` - Get feature request details
  - `create` - Create feature request
  - `update` - Update feature request
  - `delete` - Delete feature request
  - `bulkCreate` - Create multiple feature requests

- [ ] Router `member` with procedures:
  - `getOrganizationMembers` - List members of organization
  - `addOrganizationMember` - Add member to organization
  - `removeOrganizationMember` - Remove member from organization
  - `updateOrganizationMemberRole` - Update member role

### 1.4 Permissions & Authorization

**Already in place**:
- `authProcedure` checks that `ctx.user` exists
- `user.role` exists ('user' | 'admin') for global roles
- Middleware pattern in `src/trpc/index.ts`

**Simplified permission model** (organization-level only):
- **admin**: Full control (org settings + all context spaces)
- **manager**: Can view and modify all context spaces, can't manage org
- **member**: Can view all context spaces + use AI, can only edit own created spaces

**Permission matrix**:

| Action | admin | manager | member |
|--------|-------|---------|--------|
| Manage org settings | ✅ | ❌ | ❌ |
| Invite/remove members | ✅ | ❌ | ❌ |
| View all spaces | ✅ | ✅ | ✅ |
| Create space | ✅ | ✅ | ✅ |
| Edit any space | ✅ | ✅ | ❌* |
| Delete any space | ✅ | ❌** | ❌* |
| Use AI | ✅ | ✅ | ✅ |

*Can only edit/delete own created items
**Can only delete own created spaces

**Tasks**:
- [ ] Create helpers in `apps/backend/src/lib/permissions.ts`:
  - `getOrganizationMember(userId, organizationId)`
  - `canEditContextSpace(userId, spaceId)`
  - `canDeleteContextSpace(userId, spaceId)`
  - `canManageOrganization(userId, organizationId)`
- [ ] Apply permission checks in routers

### 1.5 Common - Zod Schemas

**Existing pattern** (see `user.ts`):
- Schemas in `apps/common/src/schemas/`
- Import in routers: `import { schema } from '@common/schemas/...'`
- Types exported in `apps/common/src/index.ts`

**Tasks**:
- [ ] `apps/common/src/schemas/organization.ts`
  - `createOrganizationSchema`
  - `updateOrganizationSchema`
- [ ] `apps/common/src/schemas/context-space.ts`
  - `createContextSpaceSchema`
  - `updateContextSpaceSchema`
- [ ] `apps/common/src/schemas/feature-request.ts`
  - `createFeatureRequestSchema`
  - `updateFeatureRequestSchema`
  - `bulkCreateFeatureRequestsSchema`
- [ ] `apps/common/src/schemas/member.ts`
  - `addOrganizationMemberSchema`
  - `updateOrganizationMemberRoleSchema`

### 1.6 Frontend - Stores

**Existing pattern** (see `auth.ts`):
- Use `createGlobalState` from VueUse
- Use `useAsyncState` for fetching
- Pattern: `const { state } = useAsyncState(() => client.xxx.query(), null)`

**Tasks**:
- [ ] `apps/frontend/src/stores/organization.ts`
  - Current org state
  - Members list
  - Auto-create org if doesn't exist
- [ ] `apps/frontend/src/stores/context-space.ts`
  - Context spaces tree
  - Current space
  - Cache
- [ ] Use existing `useAuthStore` for user info

### 1.7 Frontend - Core Pages & Components

**Existing pages**:
- `/` - Home (to be modified for context spaces)
- `/account` - Account settings
- `/billing` - Billing (Stripe)
- `/admin-dashboard` - Admin dashboard (user.role === 'admin')
- `/signin`, `/signup` - Auth pages (AuthLayout)

**Pages to create** (in `apps/frontend/src/views/`):
- [ ] Modify `Home.vue` - Dashboard with context spaces list
- [ ] `ContextSpaceDetail.vue` - `/spaces/:id`
- [ ] `FeatureRequests.vue` - `/spaces/:id/feature-requests`
- [ ] `OrganizationSettings.vue` - `/settings/organization`
- [ ] `MembersSettings.vue` - `/settings/members`

**Components to create** (in `apps/frontend/src/components/`):
- [ ] `ContextSpaceTree.vue` - Hierarchical tree
- [ ] `ContextSpaceCard.vue` - Context space card
- [ ] `FeatureRequestList.vue` - Feature requests list
- [ ] `FeatureRequestForm.vue` - Create/edit form
- [ ] `OrganizationMemberList.vue` - Organization members list with roles
- [ ] `RoleSelector.vue` - Role selector

**Pattern to follow**:
- Layouts: Use `AppLayout` (already in template)
- i18n: Always use `$t('key')` - no raw text
- Loading: Use shadcn-vue skeletons
- Errors: Use existing `Error.vue` component
- Forms: Use Vee Validate (already in stack)

### 1.8 Router Guards & Sidebar

**Existing guards** (in `apps/frontend/src/router/guards.ts`):
- Pattern: `canAccessRoute(routeName, user)`
- Already defined for: Home, Account, Billing, AdminDashboard, Signin, Signup

**Tasks**:
- [ ] Add routes in `apps/frontend/src/router/index.ts`
  - `/spaces/:id`
  - `/spaces/:id/feature-requests`
  - `/settings/organization`
  - `/settings/members`
- [ ] Add guards in `apps/frontend/src/router/guards.ts`
- [ ] Modify `AppSidebar.vue` to add:
  - Link to Context Spaces
  - Settings section (organization, members)
  - Use existing pattern with `canAccessRoute`

### 1.9 Auto-creation Organization

**Behavior**:
- On user's first connection, automatically create an organization
- User becomes admin of this organization
- Transparent UX (no choice in V1)

**Tasks**:
- [ ] tRPC procedure `organization.initializeForUser`
- [ ] Call from `useAuthStore` after sign in/sign up
- [ ] Store organization in `useOrganizationStore`
- [ ] Guard that redirects if no organization

---

## Phase 2 - AI Assistants (Week 3-4)

### 2.1 AI Infrastructure

**Environment variables**:
- `AI_PROVIDER` (openai | anthropic)
- `AI_API_KEY`
- `AI_MODEL` (e.g., gpt-4, claude-3-5-sonnet)

**Tasks**:
- [ ] Service `apps/backend/src/services/ai/client.ts` - LLM Client
- [ ] Service `apps/backend/src/services/ai/embeddings.ts` - Generate embeddings
- [ ] Configuration in `apps/backend/src/lib/env.ts`

### 2.2 Database Schema - AI

**ai_conversations**
```typescript
export const aiConversation = pgTable(
  'ai_conversation',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id').references(() => contextSpace.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'context_space' | 'global'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('ai_conversation_contextSpaceId_idx').on(table.contextSpaceId),
    index('ai_conversation_userId_idx').on(table.userId),
  ],
)
```

**ai_messages**
```typescript
export const aiMessage = pgTable(
  'ai_message',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => aiConversation.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('ai_message_conversationId_idx').on(table.conversationId),
  ],
)
```

**embeddings**
```typescript
import { vector } from 'drizzle-orm/pg-core'

export const embedding = pgTable(
  'embedding',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id')
      .notNull()
      .references(() => contextSpace.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(), // 'description' | 'feature_request' | 'integration_data'
    sourceId: text('source_id').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('embedding_contextSpaceId_idx').on(table.contextSpaceId),
    index('embedding_sourceType_sourceId_idx').on(table.sourceType, table.sourceId),
  ],
)
```

**Tasks**:
- [ ] Install pgvector extension in PostgreSQL
- [ ] Install `drizzle-orm` package with pgvector support
- [ ] Add schemas to `apps/backend/src/db/schema.ts`
- [ ] Add relations for AI tables
- [ ] Generate and apply migrations

### 2.3 RAG System

**RAG Service**:
- [ ] `apps/backend/src/services/ai/rag.ts`
  - `generateEmbedding(text)` - Generate embedding
  - `storeEmbedding(contextSpaceId, sourceType, sourceId, content)` - Store
  - `searchSimilar(embedding, contextSpaceId, limit)` - Similar search
  - `getContextForSpace(contextSpaceId)` - Get complete context

**Auto-embedding**:
- [ ] Hook on context space create/update → embed description
- [ ] Hook on feature request create/update → embed title + description

### 2.4 Assistant per Context Space

**Features**:
1. Automatic context space summary
2. Duplicate detection in feature requests
3. Grouping by problem/theme
4. Quick wins identification
5. Feature suggestions
6. Contextual Q&A

**Service**:
- [ ] `apps/backend/src/services/ai/context-assistant.ts`
  - `generateSummary(contextSpaceId)` - Auto summary
  - `detectDuplicates(contextSpaceId)` - Duplicates
  - `groupByTheme(contextSpaceId)` - Grouping
  - `identifyQuickWins(contextSpaceId)` - Quick wins
  - `suggestFeatures(contextSpaceId)` - Suggestions
  - `chat(conversationId, message)` - Contextual chat

**Assistant scope**:
- Itself (description, metadata)
- Its children (recursive)
- Its parents (chain)
- All feature requests in scope

**Tasks**:
- [ ] Implement service with system prompts
- [ ] Handle scope (recursive queries)
- [ ] tRPC router `contextAssistant`

### 2.5 Global Assistant (Orchestrator)

**Features**:
1. Query multiple context spaces
2. Cross feature requests + projects
3. Help with cross-cutting product decisions
4. Auto mode (AI chooses spaces) or manual (user selects)

**Service**:
- [ ] `apps/backend/src/services/ai/global-assistant.ts`
  - `chat(conversationId, message, selectedSpaceIds?)` - Global chat
  - `analyzeAcrossSpaces(spaceIds)` - Cross analysis
  - `recommendSpaces(query)` - Recommend relevant spaces

**Tasks**:
- [ ] Implement multi-context orchestration
- [ ] tRPC router `globalAssistant`

### 2.6 tRPC Routers - AI

**Router `contextAssistant`**:
- [ ] `generateSummary` - Generate summary
- [ ] `detectDuplicates` - Detect duplicates
- [ ] `groupByTheme` - Group by theme
- [ ] `identifyQuickWins` - Identify quick wins
- [ ] `suggestFeatures` - Suggest features
- [ ] `startConversation` - Start conversation
- [ ] `sendMessage` - Send message in conversation
- [ ] `getConversation` - Get history

**Router `globalAssistant`**:
- [ ] `startConversation` - Start global conversation
- [ ] `sendMessage` - Send message
- [ ] `getConversation` - Get history
- [ ] `recommendSpaces` - Recommend spaces

### 2.7 Frontend - AI Components

**Components**:
- [ ] `AssistantChat.vue` - Chat interface (context or global)
- [ ] `AssistantSummary.vue` - Auto summary display
- [ ] `DuplicateDetection.vue` - UI for detected duplicates
- [ ] `ThemeGrouping.vue` - Feature groups
- [ ] `QuickWins.vue` - Quick wins list
- [ ] `FeatureSuggestions.vue` - AI suggestions
- [ ] `SpaceSelector.vue` - Multi-space selector for global assistant

**Pages**:
- [ ] `/spaces/:id/assistant` - Context space assistant
- [ ] `/assistant` - Global assistant

**WOW Moment**:
- On context space creation → auto summary + suggested questions
- No integration needed to get value

---

## Phase 3 - Integrations (Week 5-6)

### 3.1 Database Schema - Integrations

**integration_providers**
```typescript
import { json } from 'drizzle-orm/pg-core'

export const integrationProvider = pgTable(
  'integration_provider',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'slack' | 'asana' | 'linear' | 'miro'
    credentials: json('credentials').notNull(), // encrypted
    status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'error'
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('integration_provider_organizationId_idx').on(table.organizationId),
  ],
)
```

**integration_resources**
```typescript
export const integrationResource = pgTable(
  'integration_resource',
  {
    id: text('id').primaryKey(),
    providerId: text('provider_id')
      .notNull()
      .references(() => integrationProvider.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'channel' | 'board' | 'issue' | 'document'
    metadata: json('metadata'),
    syncedAt: timestamp('synced_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('integration_resource_providerId_idx').on(table.providerId),
  ],
)
```

**context_space_resources**
```typescript
export const contextSpaceResource = pgTable(
  'context_space_resource',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id')
      .notNull()
      .references(() => contextSpace.id, { onDelete: 'cascade' }),
    integrationResourceId: text('integration_resource_id')
      .notNull()
      .references(() => integrationResource.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('context_space_resource_contextSpaceId_idx').on(table.contextSpaceId),
    index('context_space_resource_integrationResourceId_idx').on(table.integrationResourceId),
  ],
)
```

**Tasks**:
- [ ] Add schemas to `apps/backend/src/db/schema.ts`
- [ ] Add relations for integrations
- [ ] Generate and apply migrations
- [ ] Implement encryption/decryption for credentials (crypto module)

### 3.2 Integration Services

**Structure**:
```
apps/backend/src/services/integrations/
├── base.ts               # Common interface
├── slack.ts              # Slack integration
├── asana.ts              # Asana integration
├── linear.ts             # Linear integration (or one of the two only)
└── sync.ts               # Sync service
```

**Common interface**:
```typescript
interface IntegrationService {
  authenticate(code: string): Promise<Credentials>
  listResources(): Promise<Resource[]>
  syncResource(resourceId: string): Promise<void>
  disconnect(): Promise<void>
}
```

**Tasks**:
- [ ] Slack service:
  - OAuth flow
  - List channels
  - Fetch messages
  - Webhook for real-time (optional V1)

- [ ] Asana OR Linear service:
  - OAuth flow
  - List projects/boards
  - Fetch tasks/issues
  - Sync comments

- [ ] Sync service:
  - Periodic import
  - Transform data to feature requests
  - Generate embeddings for imported data

### 3.3 tRPC Routers - Integrations

**Router `integration`**:
- [ ] `connect` - Start OAuth flow
- [ ] `callback` - Handle OAuth callback
- [ ] `disconnect` - Disconnect provider
- [ ] `listProviders` - List configured providers
- [ ] `listResources` - List available resources
- [ ] `syncResource` - Manual resource sync

**Router `contextSpaceResource`**:
- [ ] `link` - Link resource to context space
- [ ] `unlink` - Unlink resource
- [ ] `list` - List linked resources

### 3.4 Frontend - Integrations

**Pages**:
- [ ] `/settings/integrations` - Integrations configuration
- [ ] `/settings/integrations/:type/callback` - OAuth callback handler

**Components**:
- [ ] `IntegrationCard.vue` - Card for each provider
- [ ] `ResourcePicker.vue` - Resource selector to link
- [ ] `LinkedResources.vue` - Linked resources list

**User flow**:
1. Settings → Integrations
2. Click "Connect Slack"
3. OAuth flow
4. Select channels to monitor
5. In context space → link resources
6. Auto sync data

---

## Phase 4 - Polish & Production (Week 7)

### 4.1 UX Improvements

**Tasks**:
- [ ] Loading states with skeletons
- [ ] Error handling with clear messages
- [ ] Empty states with CTAs
- [ ] Onboarding for new user
- [ ] Tooltips and help text
- [ ] Responsive design (mobile-friendly)

### 4.2 Performance

**Tasks**:
- [ ] Database indexes on frequent columns
- [ ] Cache tRPC queries (TanStack Query)
- [ ] Lazy loading context spaces (pagination)
- [ ] Debounce on search
- [ ] Optimistic updates

### 4.3 Security

**Tasks**:
- [ ] Rate limiting on AI endpoints
- [ ] Strict input validation (Zod)
- [ ] Output sanitization
- [ ] CORS configuration
- [ ] Helmet for security headers
- [ ] Credentials encryption for integrations
- [ ] Permissions audit

### 4.4 Monitoring & Logging

**Tasks**:
- [ ] Logger (Pino or Winston)
- [ ] Error tracking (Sentry optional)
- [ ] Analytics (Posthog optional)
- [ ] Health check endpoint
- [ ] AI metrics (cost, latency)

### 4.5 Documentation

**Tasks**:
- [ ] Complete README
- [ ] Deployment guide
- [ ] Documented environment variables
- [ ] User guide (in-app or docs)

---

## Deployment Checklist

### Backend
- [ ] Database migrations executed
- [ ] Environment variables configured
- [ ] AI API key configured
- [ ] PostgreSQL with pgvector installed
- [ ] Health check functional

### Frontend
- [ ] Production build
- [ ] Environment variables
- [ ] Analytics configured (if enabled)
- [ ] Error tracking (if enabled)

### Infrastructure
- [ ] Database backups
- [ ] SSL/TLS
- [ ] CDN for assets (optional)
- [ ] Uptime monitoring

---

## Priorities & Strict MVP

### Must-Have (MVP)
1. ✅ User/Organization/Members
2. ✅ Context Spaces CRUD + hierarchy
3. ✅ Manual Feature Requests
4. ✅ Permissions per Context Space
5. ✅ AI assistant per Context Space (chat + analysis)
6. ✅ Global Assistant

### Should-Have (Post-MVP)
1. Slack integration
2. Asana OR Linear integration
3. Advanced embeddings + optimized RAG
4. AI usage analytics

### Could-Have (V2)
1. Multi-organization per user
2. Multi-org UI
3. Integration webhooks (real-time)
4. Public API
5. Miro integration
6. Context space templates
7. Export reports

---

## Estimated Timeline

- **Phase 1** (Core): 2 weeks
- **Phase 2** (AI): 2 weeks
- **Phase 3** (Integrations): 2 weeks
- **Phase 4** (Polish): 1 week

**Total MVP**: ~7 weeks

---

## Important Notes

1. **Organization invisible in V1** but architecture ready
2. **Integrations optional** - app must be usable without
3. **WOW moment** = first intelligent AI response
4. **Each Context Space** has its assistant
5. **RAG** on description + feature requests minimum
6. **Permissions** at organization level only (no per-space permissions in V1)
7. **Creator** can always edit/delete their own spaces
8. Code and comments in **English**
9. **No raw text in pages**, use **translations** (vue-i18n: `$t('key')`)
10. Zod schemas in **common package** (`apps/common/src/schemas/`)
11. Use **authProcedure** for protected routes (no custom auth middleware)
12. Everything in **one** `schema.ts` (no separate files)
13. Use **existing patterns** from template (stores, components, guards)
14. **AppLayout** for app pages, **AuthLayout** for signin/signup
15. Follow **shadcn-vue** patterns for components

---

## Recommended Task Order

### Sprint 1 (Week 1)
1. Database schema (organizations, context_spaces, members) in `schema.ts`
2. Drizzle migrations (`db:push` in dev)
3. tRPC routers (organization, context-space) with authProcedure
4. Organization auto-create (procedure + hook in useAuthStore)
5. Frontend: stores (organization, context-space) + routing + guards

### Sprint 2 (Week 2)
1. Feature requests schema + router
2. Permissions helpers (lib/permissions.ts)
3. Frontend: main pages (modified Home, ContextSpaceDetail, FeatureRequests)
4. Components: ContextSpaceTree, ContextSpaceCard, FeatureRequestList
5. Feature requests CRUD UI (with Vee Validate forms)
6. Update AppSidebar with new links
7. i18n keys for all texts

### Sprint 3 (Week 3)
1. AI infrastructure (LLM client, embeddings)
2. AI database schema (conversations, messages, embeddings)
3. Basic RAG system
4. Context assistant service (summary, chat)

### Sprint 4 (Week 4)
1. Context assistant router + UI
2. Global assistant service
3. Global assistant router + UI
4. Auto-summary on space creation
5. WOW moment implementation

### Sprint 5 (Week 5)
1. Integrations schema
2. Slack service + OAuth
3. Integration router
4. Integration UI (settings)

### Sprint 6 (Week 6)
1. Asana OR Linear service
2. Sync service
3. Resource linking UI
4. Auto-import feature requests

### Sprint 7 (Week 7)
1. Polish UX/UI
2. Performance optimization
3. Security audit
4. Documentation
5. Deployment prep

---

## Success Criteria

### Functionality
- [ ] User can create a context space and add feature requests manually
- [ ] AI assistant responds relevantly to context
- [ ] Global assistant can cross multiple context spaces
- [ ] Permissions work correctly
- [ ] App is usable without any integration

### Performance
- [ ] AI response < 5s (average)
- [ ] Smooth navigation
- [ ] No UI blocking

### UX
- [ ] Clear onboarding
- [ ] Obvious WOW moment
- [ ] Intuitive interface
- [ ] Responsive

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| High AI cost | High | Rate limiting, cache, cheaper model |
| AI latency | Medium | Streaming responses, loading states |
| RAG complexity | High | Simple MVP first, iterate |
| OAuth complexity | Medium | One integration at a time |
| Permissions complexity | High | Unit tests, clear docs |

---

**Ready to start development!** 🚀
