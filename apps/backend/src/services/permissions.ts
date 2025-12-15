import type { SelectOrganizationMember } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { contextSpace, organizationMember } from '../db/schema'

export interface OrganizationMemberWithRole {
  id: string
  userId: string
  organizationId: string
  role: string
  createdAt: Date
}

/**
 * Get organization member by user ID and organization ID
 */
export async function getOrganizationMember(
  userId: string,
  organizationId: string,
): Promise<OrganizationMemberWithRole | null> {
  const [member] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.userId, userId),
        eq(organizationMember.organizationId, organizationId),
      ),
    )
    .limit(1)

  return member || null
}

/**
 * Check if user can manage organization (settings, members)
 * Only admins can manage organization
 */
export async function canManageOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const member = await getOrganizationMember(userId, organizationId)

  if (!member) {
    return false
  }

  return member.role === 'admin'
}

/**
 * Check if user can edit a context space
 * - Admins can edit any space
 * - Managers can edit any space
 * - Members can only edit spaces they created
 */
export async function canEditContextSpace(
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const [space] = await db
    .select()
    .from(contextSpace)
    .where(eq(contextSpace.id, spaceId))
    .limit(1)

  if (!space) {
    return false
  }

  // Check if user created this space
  if (space.createdBy === userId) {
    return true
  }

  // Check organization membership and role
  const member = await getOrganizationMember(userId, space.organizationId)

  if (!member) {
    return false
  }

  // Admins and managers can edit any space
  return member.role === 'admin' || member.role === 'manager'
}

/**
 * Check if user can delete a context space
 * - Admins can delete any space
 * - Managers can only delete spaces they created
 * - Members can only delete spaces they created
 */
export async function canDeleteContextSpace(
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const [space] = await db
    .select()
    .from(contextSpace)
    .where(eq(contextSpace.id, spaceId))
    .limit(1)

  if (!space) {
    return false
  }

  // Check if user created this space
  if (space.createdBy === userId) {
    return true
  }

  // Check organization membership and role
  const member = await getOrganizationMember(userId, space.organizationId)

  if (!member) {
    return false
  }

  // Only admins can delete spaces they didn't create
  return member.role === 'admin'
}

/**
 * Check if user has access to view a context space
 * All organization members can view all spaces
 */
export async function canViewContextSpace(
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const [space] = await db
    .select()
    .from(contextSpace)
    .where(eq(contextSpace.id, spaceId))
    .limit(1)

  if (!space) {
    return false
  }

  // Check if user is a member of the organization
  const member = await getOrganizationMember(userId, space.organizationId)

  return member !== null
}

/**
 * Get user's current organization (assumes one org per user in V1)
 */
export async function getUserOrganization(userId: string): Promise<Pick<SelectOrganizationMember, 'organizationId' | 'role'> | null> {
  const [member] = await db
    .select({
      organizationId: organizationMember.organizationId,
      role: organizationMember.role,
    })
    .from(organizationMember)
    .where(eq(organizationMember.userId, userId))
    .limit(1)

  return member || null
}
