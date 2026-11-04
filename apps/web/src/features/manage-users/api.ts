import type { AuthRole, Permission } from '@/entities/session';
import { httpClient } from '@/shared/api/httpClient';

export interface ManagedUser {
  id: string;
  username: string;
  role: AuthRole;
  permissions: Permission[];
  grantedPermissions: Permission[];
  revokedPermissions: Permission[];
  passwordChangedAt: string | null;
  passwordChangedBy: 'self' | 'admin' | 'cli' | null;
  passwordChangedByName: string | null;
  createdAt: string;
  sessions: number;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: AuthRole;
}

export interface UpdateUserPayload {
  role?: AuthRole;
  password?: string;
  grantedPermissions?: Permission[];
  revokedPermissions?: Permission[];
}

export const usersApi = {
  list(): Promise<{ users: ManagedUser[] }> {
    return httpClient.get<{ users: ManagedUser[] }>('/users');
  },

  create(payload: CreateUserPayload): Promise<{ user: ManagedUser }> {
    return httpClient.post<{ user: ManagedUser }>('/users', payload);
  },

  update(id: string, payload: UpdateUserPayload): Promise<{ user: ManagedUser }> {
    return httpClient.patch<{ user: ManagedUser }>(`/users/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return httpClient.delete<void>(`/users/${id}`);
  },

  logout(id: string): Promise<void> {
    return httpClient.post<void>(`/users/${id}/logout`);
  },
};
