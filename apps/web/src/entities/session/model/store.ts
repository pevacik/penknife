import { create } from 'zustand';
import {
  AUTH_FORBIDDEN_EVENT,
  AUTH_UNAUTHORIZED_EVENT,
} from '@/shared/api/httpClient';
import { authApi } from '../api';
import type { AuthUser } from '../api';

type AuthStatus = 'checking' | 'authenticated' | 'guest';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadMe: () => Promise<void>;
  handleUnauthorized: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'checking',
  user: null,
  error: null,

  login: async (username, password) => {
    set({ error: null });

    try {
      const { user } = await authApi.login(username, password);
      set({ user, status: 'authenticated', error: null });
      return true;
    } catch (error) {
      set({
        user: null,
        status: 'guest',
        error: error instanceof Error && error.message ? error.message : 'Не удалось войти',
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Сессия могла уже истечь — выходим локально в любом случае.
    }
    set({ user: null, status: 'guest', error: null });
  },

  loadMe: async () => {
    try {
      const { user } = await authApi.me();
      set({ user, status: 'authenticated', error: null });
    } catch {
      set({ user: null, status: 'guest' });
    }
  },

  handleUnauthorized: () => {
    if (get().status !== 'guest') {
      set({ user: null, status: 'guest', error: null });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, () => {
    useAuthStore.getState().handleUnauthorized();
  });

  // Права могли изменить в админке: при 403 и возврате на вкладку
  // перезапрашиваем /me, чтобы UI обновил доступные действия.
  let lastRefreshAt = 0;

  const refreshMe = () => {
    const now = Date.now();
    if (now - lastRefreshAt < 30_000) {
      return;
    }
    lastRefreshAt = now;
    void useAuthStore.getState().loadMe();
  };

  window.addEventListener(AUTH_FORBIDDEN_EVENT, refreshMe);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useAuthStore.getState().status === 'authenticated') {
      refreshMe();
    }
  });
}
