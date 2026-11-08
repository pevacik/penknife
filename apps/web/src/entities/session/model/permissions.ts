import { useAuthStore } from './store';
import type { AuthRole, Permission } from '../api';

export const ROLE_LABEL: Record<AuthRole, string> = {
  admin: 'Администратор',
  user: 'Пользователь',
  viewer: 'Просмотр (демо)',
};

/** Базовые права роли. Персональные надстройки хранятся на сервере. */
export const ROLE_PERMISSIONS: Record<AuthRole, Permission[]> = {
  admin: [
    'viewProducts',
    'createProduct',
    'editProduct',
    'deleteProduct',
    'manageImages',
    'deleteImages',
    'manageComments',
    'deleteComments',
    'csv',
    'exportPdf',
    'manageUsers',
    'viewAudit',
  ],
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

/** Права, которые можно выдать/отозвать персонально. */
export const OVERRIDABLE_PERMISSIONS: Permission[] = [
  'createProduct',
  'editProduct',
  'manageImages',
  'manageComments',
  'exportPdf',
];

export const PERMISSION_LABEL: Record<Permission, string> = {
  viewProducts: 'Просмотр карточек',
  createProduct: 'Создание карточек',
  editProduct: 'Редактирование карточек',
  deleteProduct: 'Удаление карточек',
  manageImages: 'Добавление изображений',
  deleteImages: 'Удаление изображений',
  manageComments: 'Добавление и редактирование комментариев',
  deleteComments: 'Удаление комментариев',
  csv: 'Импорт/экспорт CSV',
  exportPdf: 'Экспорт PDF',
  manageUsers: 'Управление пользователями',
  viewAudit: 'Просмотр журнала',
};

export const PERMISSION_GROUPS: Array<{ title: string; permissions: Permission[] }> = [
  { title: 'Карточки', permissions: ['createProduct', 'editProduct'] },
  { title: 'Изображения и комментарии', permissions: ['manageImages', 'manageComments'] },
  { title: 'Данные', permissions: ['exportPdf'] },
];

/** Единая точка проверки прав в UI. Сервер всё равно проверяет право сам. */
export function useCan(permission: Permission): boolean {
  const permissions = useAuthStore((state) => state.user?.permissions);
  return permissions?.includes(permission) ?? false;
}
