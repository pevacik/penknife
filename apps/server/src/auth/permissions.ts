import type { Role } from './roles';

export const PERMISSIONS = [
  'viewProducts',
  'createProduct',
  'editProduct',
  'deleteProduct',
  'manageImages',
  'deleteImages',
  'manageComments',
  'deleteComments',
  'csv',
  'csvImport',
  'exportPdf',
  'manageUsers',
  'addUsers',
  'viewAudit',
  'viewPasswords',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Права, которые нельзя переопределять персонально (структурные). */
export const STRUCTURAL_PERMISSIONS: Permission[] = [
  'viewProducts',
  'addUsers',
  'viewPasswords',
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
  viewer: ['viewProducts'],
};

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function isOverridablePermission(value: string): value is Permission {
  return (OVERRIDABLE_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Эффективные права: база роли + персонально выданные − отозванные.
 * Структурные права: просмотр есть у всех, добавление пользователей и показ
 * паролей — только у роли admin (защита от выдачи опасных операций).
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
    // Добавление пользователей и показ паролей — только у роли admin.
    result.delete('addUsers');
    result.delete('viewPasswords');
  } else {
    result.add('addUsers');
    result.add('viewPasswords');
  }

  return PERMISSIONS.filter((permission) => result.has(permission));
}
