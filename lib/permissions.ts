/**
 * Permission bits for group membership
 * Permissions are stored as a bitmask integer allowing fine-grained control
 */
export const Permissions = {
  VIEW: 1,           // See tasks in the group
  CREATE: 2,         // Create new tasks in the group
  EDIT_OWN: 4,       // Edit tasks they created
  EDIT_ANY: 8,       // Edit any task in the group
  DELETE_OWN: 16,    // Delete tasks they created
  DELETE_ANY: 32,    // Delete any task in the group
  MANAGE_MEMBERS: 64, // Approve join requests, add/remove members
} as const

export type PermissionKey = keyof typeof Permissions

/**
 * Common permission presets
 */
export const PermissionPresets = {
  // Read-only member: VIEW only
  READONLY: Permissions.VIEW,
  // Standard member: VIEW + CREATE + EDIT_OWN + DELETE_OWN
  MEMBER: Permissions.VIEW | Permissions.CREATE | Permissions.EDIT_OWN | Permissions.DELETE_OWN,
  // Editor: VIEW + CREATE + EDIT_OWN + EDIT_ANY + DELETE_OWN
  EDITOR: Permissions.VIEW | Permissions.CREATE | Permissions.EDIT_OWN | Permissions.EDIT_ANY | Permissions.DELETE_OWN,
  // Manager: All permissions
  MANAGER: Permissions.VIEW | Permissions.CREATE | Permissions.EDIT_OWN | Permissions.EDIT_ANY | Permissions.DELETE_OWN | Permissions.DELETE_ANY | Permissions.MANAGE_MEMBERS,
} as const

/**
 * Check if a member has a specific permission
 */
export function hasPermission(memberPermissions: number, requiredPermission: number): boolean {
  return (memberPermissions & requiredPermission) !== 0
}

/**
 * Check if a member has all of the specified permissions
 */
export function hasAllPermissions(memberPermissions: number, ...requiredPermissions: number[]): boolean {
  const combined = requiredPermissions.reduce((acc, p) => acc | p, 0)
  return (memberPermissions & combined) === combined
}

/**
 * Build a permission bitmask from multiple permission bits
 */
export function buildPermissions(...bits: number[]): number {
  return bits.reduce((acc, bit) => acc | bit, 0)
}

/**
 * Add a permission to an existing bitmask
 */
export function addPermission(currentPermissions: number, permission: number): number {
  return currentPermissions | permission
}

/**
 * Remove a permission from an existing bitmask
 */
export function removePermission(currentPermissions: number, permission: number): number {
  return currentPermissions & ~permission
}

/**
 * Toggle a permission in a bitmask
 */
export function togglePermission(currentPermissions: number, permission: number): number {
  return currentPermissions ^ permission
}

/**
 * Get list of permission keys that are set in a bitmask
 */
export function getPermissionList(permissions: number): PermissionKey[] {
  return (Object.keys(Permissions) as PermissionKey[]).filter(
    (key) => hasPermission(permissions, Permissions[key])
  )
}

/**
 * Get human-readable labels for permissions
 */
export const PermissionLabels: Record<PermissionKey, string> = {
  VIEW: "View tasks",
  CREATE: "Create tasks",
  EDIT_OWN: "Edit own tasks",
  EDIT_ANY: "Edit any task",
  DELETE_OWN: "Delete own tasks",
  DELETE_ANY: "Delete any task",
  MANAGE_MEMBERS: "Manage members",
}

/**
 * Default permission value for new members (standard member)
 */
export const DEFAULT_MEMBER_PERMISSIONS = PermissionPresets.MEMBER // 23

/**
 * Full permission value for group creators
 */
export const FULL_PERMISSIONS = PermissionPresets.MANAGER // 127
