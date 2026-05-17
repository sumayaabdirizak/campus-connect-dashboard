import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isRole, type Role } from '@/types/auth';

export interface User {
  id: number | string;
  full_name?: string;
  name?: string;
  email: string;
  role: Role;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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
          const response = await fetch(`${API_BASE_URL}/users/me`, {
            credentials: 'include'
          });
          if (!response.ok) {
            set({ user: null, isAuthenticated: false, isSessionChecked: true });
            return false;
          }
          const userData = (await response.json()) as Partial<User> & { role?: unknown };
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
