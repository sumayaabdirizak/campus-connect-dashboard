import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isRole, type Role } from '@/types/auth';

export interface User {
  id: number | string;
  full_name?: string;
  name?: string;
  email: string;
  role: Role;
  /** Every role this user may switch into (primary role + any granted secondary roles). */
  availableRoles?: Role[];
  avatarUrl?: string | null;
  /** Explicit consent for campus announcement SMS (TCPA-style). */
  smsOptIn?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isSessionChecked: boolean;
  // Primary action used by sign-in flow
  setUser: (user: User | null) => void;
  validateSession: () => Promise<boolean>;
  clearAuth: () => void;
  // Kept for backward compatibility
  login: (user: User) => void;
  logout: () => void;
}

import { getApiBaseUrl } from '@/lib/api-config';

const API_BASE_URL = getApiBaseUrl();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isSessionChecked: false,
      setUser: (user) =>
        set(() => ({
          user,
          isAuthenticated: !!user,
          isSessionChecked: true
        })),
      validateSession: async () => {
        const { apiClient, ApiError } = await import('@/lib/api-client');
        try {
          const userData = await apiClient<Partial<User> & { role?: unknown }>('/users/me');
          if (!userData || !isRole(userData.role)) {
            set({ user: null, isAuthenticated: false, isSessionChecked: true });
            return false;
          }
          const user = userData as User;
          set({ user, isAuthenticated: true, isSessionChecked: true });
          return true;
        } catch (err) {
          const status = err instanceof ApiError ? err.status : undefined;
          if (status === 401 || status === 403) {
            set({ user: null, isAuthenticated: false, isSessionChecked: true });
            return false;
          }
          set({ isSessionChecked: true });
          return get().isAuthenticated;
        }
      },
      clearAuth: () => {
        set({ user: null, isAuthenticated: false, isSessionChecked: true });
      },
      login: (user) => set({ user, isAuthenticated: true, isSessionChecked: true }),
      logout: () => {
        set({ user: null, isAuthenticated: false, isSessionChecked: true });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
