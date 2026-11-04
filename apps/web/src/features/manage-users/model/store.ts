import { create } from 'zustand';
import { usersApi } from '../api';
import type { CreateUserPayload, ManagedUser, UpdateUserPayload } from '../api';

interface UsersState {
  users: ManagedUser[];
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  create: (payload: CreateUserPayload) => Promise<boolean>;
  update: (id: string, payload: UpdateUserPayload) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  logoutSessions: (id: string) => Promise<void>;
  clearError: () => void;
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const { users } = await usersApi.list();
      set({ users, loading: false });
    } catch (error) {
      set({ loading: false, error: message(error, 'Не удалось загрузить пользователей') });
    }
  },

  create: async (payload) => {
    set({ error: null });
    try {
      await usersApi.create(payload);
      await get().load();
      return true;
    } catch (error) {
      set({ error: message(error, 'Не удалось создать пользователя') });
      return false;
    }
  },

  update: async (id, payload) => {
    set({ error: null });
    try {
      await usersApi.update(id, payload);
      await get().load();
      return true;
    } catch (error) {
      set({ error: message(error, 'Не удалось сохранить изменения') });
      return false;
    }
  },

  remove: async (id) => {
    set({ error: null });
    try {
      await usersApi.remove(id);
      await get().load();
      return true;
    } catch (error) {
      set({ error: message(error, 'Не удалось удалить пользователя') });
      return false;
    }
  },

  logoutSessions: async (id) => {
    set({ error: null });
    try {
      await usersApi.logout(id);
      await get().load();
    } catch (error) {
      set({ error: message(error, 'Не удалось завершить сессии') });
    }
  },

  clearError: () => set({ error: null }),
}));
