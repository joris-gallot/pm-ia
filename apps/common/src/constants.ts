// Organization member roles
export const ORGANIZATION_ROLES = ['admin', 'manager', 'member'] as const
export type OrganizationRole = typeof ORGANIZATION_ROLES[number]

// Feature request sources
export const FEATURE_REQUEST_SOURCES = ['manual', 'imported'] as const
export type FeatureRequestSource = typeof FEATURE_REQUEST_SOURCES[number]

// AI Providers
export const AI_PROVIDERS = ['ollama', 'openai', 'anthropic'] as const
export type AIProvider = typeof AI_PROVIDERS[number]

// AI Conversation types
export const CONVERSATION_TYPES = ['context_space', 'global'] as const
export type ConversationType = typeof CONVERSATION_TYPES[number]

// AI Message roles
export const MESSAGE_ROLES = ['system', 'user', 'assistant'] as const
export type MessageRole = typeof MESSAGE_ROLES[number]

// AI Embedding source types
export const EMBEDDING_SOURCE_TYPES = ['description', 'feature_request', 'integration_data'] as const
export type EmbeddingSourceType = typeof EMBEDDING_SOURCE_TYPES[number]

// AI Capabilities
export const AI_CAPABILITIES = ['chat', 'embeddings'] as const
export type AICapability = typeof AI_CAPABILITIES[number]

// AI Credential sources
export const CREDENTIAL_SOURCES = ['user', 'organization', 'system'] as const
export type CredentialSource = typeof CREDENTIAL_SOURCES[number]
