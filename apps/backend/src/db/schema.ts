import type {
  AI_CAPABILITIES,
  AI_PROVIDERS,
  AICapability,
  AIProvider,
  CONVERSATION_TYPES,
  ConversationType,
  CREDENTIAL_SOURCES,
  CredentialSource,
  EMBEDDING_SOURCE_TYPES,
  EmbeddingSourceType,
  FEATURE_REQUEST_SOURCES,
  FeatureRequestSource,
  MESSAGE_ROLES,
  MessageRole,
  ORGANIZATION_ROLES,
  OrganizationRole,
} from '@common/constants'
import { relations } from 'drizzle-orm'
import {
  boolean,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  vector,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  stripeCustomerId: text('stripe_customer_id'),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  table => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  table => [index('verification_identifier_idx').on(table.identifier)],
)

export const subscription = pgTable('subscription', {
  id: text('id').primaryKey(),
  plan: text('plan').notNull(),
  referenceId: text('reference_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status').default('incomplete'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  seats: integer('seats'),
})

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

// Organization tables
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
    role: text<'role', OrganizationRole, typeof ORGANIZATION_ROLES>('role').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('organization_member_userId_idx').on(table.userId),
    index('organization_member_organizationId_idx').on(table.organizationId),
  ],
)

export type SelectOrganizationMember = typeof organizationMember.$inferSelect

export const contextSpace = pgTable(
  'context_space',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
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
    index('context_space_createdBy_idx').on(table.createdBy),
  ],
)

export const featureRequest = pgTable(
  'feature_request',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id')
      .notNull()
      .references(() => contextSpace.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    source: text<'source', FeatureRequestSource, typeof FEATURE_REQUEST_SOURCES>('source').notNull().default('manual'),
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
    index('feature_request_createdBy_idx').on(table.createdBy),
  ],
)

// Relations
export const organizationRelations = relations(organization, ({ one, many }) => ({
  subscription: one(subscription, {
    fields: [organization.subscriptionId],
    references: [subscription.id],
  }),
  members: many(organizationMember),
  contextSpaces: many(contextSpace),
}))

export const organizationMemberRelations = relations(organizationMember, ({ one }) => ({
  user: one(user, {
    fields: [organizationMember.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [organizationMember.organizationId],
    references: [organization.id],
  }),
}))

export const contextSpaceRelations = relations(contextSpace, ({ one, many }) => ({
  organization: one(organization, {
    fields: [contextSpace.organizationId],
    references: [organization.id],
  }),
  creator: one(user, {
    fields: [contextSpace.createdBy],
    references: [user.id],
  }),
  parent: one(contextSpace, {
    fields: [contextSpace.parentId],
    references: [contextSpace.id],
    relationName: 'parent',
  }),
  children: many(contextSpace, {
    relationName: 'parent',
  }),
  featureRequests: many(featureRequest),
}))

export const featureRequestRelations = relations(featureRequest, ({ one }) => ({
  contextSpace: one(contextSpace, {
    fields: [featureRequest.contextSpaceId],
    references: [contextSpace.id],
  }),
  creator: one(user, {
    fields: [featureRequest.createdBy],
    references: [user.id],
  }),
}))

// AI Tables

// AI Provider Configuration (system/org level)
export const aiProviderConfig = pgTable(
  'ai_provider_config',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }), // null = system default
    provider: text<'provider', AIProvider, typeof AI_PROVIDERS>('provider').notNull(),
    apiKey: text('api_key'), // encrypted, nullable for Ollama
    apiUrl: text('api_url'), // for custom Ollama endpoint
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('ai_provider_config_organizationId_idx').on(table.organizationId),
    index('ai_provider_config_provider_idx').on(table.provider),
  ],
)

// User BYO Tokens (Bring Your Own API Keys)
export const aiUserCredential = pgTable(
  'ai_user_credential',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text<'provider', AIProvider, typeof AI_PROVIDERS>('provider').notNull(),
    apiKey: text('api_key').notNull(), // encrypted
    isEnabled: boolean('is_enabled').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [
    index('ai_user_credential_userId_idx').on(table.userId),
    index('ai_user_credential_provider_idx').on(table.provider),
  ],
)

// AI Model Configuration (available models and pricing)
export const aiModelConfig = pgTable(
  'ai_model_config',
  {
    id: text('id').primaryKey(),
    provider: text<'provider', AIProvider, typeof AI_PROVIDERS>('provider').notNull(),
    modelId: text('model_id').notNull(), // e.g., 'gpt-4', 'llama3'
    displayName: text('display_name').notNull(),
    capabilities: text<'capabilities', AICapability, typeof AI_CAPABILITIES>('capabilities').array().notNull(),
    contextWindow: integer('context_window').notNull(),
    costPer1kTokensInput: decimal('cost_per_1k_tokens_input'), // null for Ollama
    costPer1kTokensOutput: decimal('cost_per_1k_tokens_output'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('ai_model_config_provider_idx').on(table.provider),
    index('ai_model_config_modelId_idx').on(table.modelId),
  ],
)

// AI Conversations
export const aiConversation = pgTable(
  'ai_conversation',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id').references(() => contextSpace.id, { onDelete: 'cascade' }), // nullable for global
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    type: text<'type', ConversationType, typeof CONVERSATION_TYPES>('type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('ai_conversation_contextSpaceId_idx').on(table.contextSpaceId),
    index('ai_conversation_userId_idx').on(table.userId),
    index('ai_conversation_organizationId_idx').on(table.organizationId),
  ],
)

// AI Messages
export const aiMessage = pgTable(
  'ai_message',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => aiConversation.id, { onDelete: 'cascade' }),
    role: text<'role', MessageRole, typeof MESSAGE_ROLES>('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('ai_message_conversationId_idx').on(table.conversationId),
  ],
)

// Embeddings (with pgvector)
export const embedding = pgTable(
  'embedding',
  {
    id: text('id').primaryKey(),
    contextSpaceId: text('context_space_id')
      .notNull()
      .references(() => contextSpace.id, { onDelete: 'cascade' }),
    sourceType: text<'source_type', EmbeddingSourceType, typeof EMBEDDING_SOURCE_TYPES>('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small dimensions
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('embedding_contextSpaceId_idx').on(table.contextSpaceId),
    index('embedding_sourceType_idx').on(table.sourceType),
    index('embedding_sourceId_idx').on(table.sourceId),
  ],
)

// AI Usage Log (tracking and costs)
export const aiUsageLog = pgTable(
  'ai_usage_log',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    provider: text<'provider', AIProvider, typeof AI_PROVIDERS>('provider').notNull(),
    modelId: text('model_id').notNull(),
    capability: text<'capability', AICapability, typeof AI_CAPABILITIES>('capability').notNull(),
    tokensInput: integer('tokens_input').notNull(),
    tokensOutput: integer('tokens_output').notNull(),
    cost: decimal('cost').notNull(),
    credentialSource: text<'credential_source', CredentialSource, typeof CREDENTIAL_SOURCES>('credential_source').notNull(),
    conversationId: text('conversation_id').references(() => aiConversation.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [
    index('ai_usage_log_userId_idx').on(table.userId),
    index('ai_usage_log_organizationId_idx').on(table.organizationId),
    index('ai_usage_log_provider_idx').on(table.provider),
    index('ai_usage_log_conversationId_idx').on(table.conversationId),
    index('ai_usage_log_createdAt_idx').on(table.createdAt),
  ],
)

// AI Relations
export const aiProviderConfigRelations = relations(aiProviderConfig, ({ one }) => ({
  organization: one(organization, {
    fields: [aiProviderConfig.organizationId],
    references: [organization.id],
  }),
}))

export const aiUserCredentialRelations = relations(aiUserCredential, ({ one }) => ({
  user: one(user, {
    fields: [aiUserCredential.userId],
    references: [user.id],
  }),
}))

export const aiConversationRelations = relations(aiConversation, ({ one, many }) => ({
  contextSpace: one(contextSpace, {
    fields: [aiConversation.contextSpaceId],
    references: [contextSpace.id],
  }),
  user: one(user, {
    fields: [aiConversation.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [aiConversation.organizationId],
    references: [organization.id],
  }),
  messages: many(aiMessage),
  usageLogs: many(aiUsageLog),
}))

export const aiMessageRelations = relations(aiMessage, ({ one }) => ({
  conversation: one(aiConversation, {
    fields: [aiMessage.conversationId],
    references: [aiConversation.id],
  }),
}))

export const embeddingRelations = relations(embedding, ({ one }) => ({
  contextSpace: one(contextSpace, {
    fields: [embedding.contextSpaceId],
    references: [contextSpace.id],
  }),
}))

export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
  user: one(user, {
    fields: [aiUsageLog.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [aiUsageLog.organizationId],
    references: [organization.id],
  }),
  conversation: one(aiConversation, {
    fields: [aiUsageLog.conversationId],
    references: [aiConversation.id],
  }),
}))
