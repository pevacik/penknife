import { httpClient } from '@/shared/api/httpClient';

export type AuthRole = 'admin' | 'user' | 'viewer';

export type Permission =
  | 'viewProducts'
  | 'createProduct'
  | 'editProduct'
  | 'deleteProduct'
  | 'manageImages'
  | 'manageComments'
  | 'deleteComments'
  | 'csv'
  | 'exportPdf'
  | 'manageUsers';

export interface AuthUser {
  id: string;
  username: string;
  role: AuthRole;
  permissions: Permission[];
}

export const authApi = {
  login(username: string, password: string): Promise<{ user: AuthUser }> {
    return httpClient.post<{ user: AuthUser }>('/auth/login', { username, password });
  },

  logout(): Promise<void> {
    return httpClient.post<void>('/auth/logout');
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return httpClient.post<void>('/auth/password', { currentPassword, newPassword });
  },

  me(): Promise<{ user: AuthUser }> {
    return httpClient.get<{ user: AuthUser }>('/auth/me');
  },
};
