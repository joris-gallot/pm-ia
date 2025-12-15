// Organization member roles
export const ORGANIZATION_ROLES = ['admin', 'manager', 'member'] as const
export type OrganizationRole = typeof ORGANIZATION_ROLES[number]

// Feature request sources
export const FEATURE_REQUEST_SOURCES = ['manual', 'imported'] as const
export type FeatureRequestSource = typeof FEATURE_REQUEST_SOURCES[number]
