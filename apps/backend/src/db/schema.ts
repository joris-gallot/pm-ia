import type { FEATURE_REQUEST_SOURCES, FeatureRequestSource, ORGANIZATION_ROLES, OrganizationRole } from '@common/constants'
import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
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
