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
    (set) => ({
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
        try {
          // A plain fetch here never attempts the silent-refresh flow, so a
          // merely-expired (but still refreshable) access token looked
          // identical to "truly logged out" — the caller would clear auth
          // and redirect to sign-in even though the refresh token was still
          // good. Route through apiClient so the same 401→refresh→retry
          // logic every other call gets is applied here too.
          const { apiClient } = await import('@/lib/api-client');
          const userData = await apiClient<Partial<User> & { role?: unknown }>('/users/me');
          if (!userData || !isRole(userData.role)) {
            set({ user: null, isAuthenticated: false, isSessionChecked: true });
            return false;
          }
          const user = userData as User;
          set({ user, isAuthenticated: true, isSessionChecked: true });
          return true;
        } catch {
          set({ user: null, isAuthenticated: false, isSessionChecked: true });
          return false;
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
