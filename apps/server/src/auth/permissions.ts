import type { Role } from './roles';

export const PERMISSIONS = [
  'viewProducts',
  'createProduct',
  'editProduct',
  'deleteProduct',
  'manageImages',
  'manageComments',
  'deleteComments',
  'csv',
  'exportPdf',
  'manageUsers',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Права, которые нельзя переопределять персонально (структурные). */
export const STRUCTURAL_PERMISSIONS: Permission[] = [
  'viewProducts',
  'deleteComments',
  'manageUsers',
];

export const OVERRIDABLE_PERMISSIONS: Permission[] = PERMISSIONS.filter(
  (permission) => !STRUCTURAL_PERMISSIONS.includes(permission),
);

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...PERMISSIONS],
  user: [
    'viewProducts',
    'createProduct',
    'editProduct',
    'manageImages',
    'manageComments',
    'exportPdf',
  ],
  viewer: ['viewProducts', 'exportPdf'],
};

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function isOverridablePermission(value: string): value is Permission {
  return (OVERRIDABLE_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Эффективные права: база роли + персонально выданные − отозванные.
 * Структурные права фиксированы: просмотр есть у всех, управление
 * пользователями — только у роли admin (защита от самоблокировки).
 */
export function getEffectivePermissions(
  role: Role,
  grantedPermissions: string[] = [],
  revokedPermissions: string[] = [],
): Permission[] {
  const result = new Set<Permission>(ROLE_PERMISSIONS[role]);

  for (const permission of grantedPermissions) {
    if (isOverridablePermission(permission)) {
      result.add(permission);
    }
  }

  for (const permission of revokedPermissions) {
    if (isOverridablePermission(permission)) {
      result.delete(permission);
    }
  }

  result.add('viewProducts');
  if (role !== 'admin') {
    result.delete('manageUsers');
  } else {
    result.add('manageUsers');
  }

  return PERMISSIONS.filter((permission) => result.has(permission));
}
