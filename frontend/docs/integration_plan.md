# Backend API Integration Plan

This document outlines the steps taken to replace the mock authentication with a real backend API integration for the Campus Connect frontend.

## 1. Architecture Overview
The integration follows these patterns:
- **Centralized API Client**: A wrapper around `fetch` that automatically adds the `Authorization: Bearer <token>` header to outgoing requests.
- **Zustand State Management**: Stores the `user` object and `token`, persisted across browser reloads via `localStorage`.
- **Authentication Guard**: A high-level component that verifies the user's role and authentication status before rendering protected content.

## 2. Implemented Components

### A. API Client (`src/lib/api-client.ts`)
A reusable utility for making authenticated requests to the backend (`http://localhost:4000/api`).

```typescript
import { useAuthStore } from './auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API error');
  }
  return response.json();
}
```

### B. Updated Auth Store (`src/lib/auth-store.ts`)
Added `token` storage and updated the `User` interface to match the backend response.

```typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export const useAuthStore = create<AuthState>()(
  persist((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    setUser: (user, token = null) => 
      set((state) => ({ user, token: token || state.token, isAuthenticated: !!user })),
    logout: () => set({ user: null, token: null, isAuthenticated: false }),
  }), { name: 'auth-storage' })
);
```

### C. Real Sign-In Logic (`src/features/auth/components/sign-in-view.tsx`)
Replaced the mock logic with a real `POST /api/auth/login` call.

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const data = await apiClient<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user, data.token); // Save both user and token
    router.push('/dashboard');
  } catch (err: any) {
    setError(err.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};
```

### D. Auth Persistence & Verification (`src/components/auth/role-guard.tsx`)
On page reload, the `RoleGuard` now verifies the token by fetching the user profile from `/api/users/me`.

```typescript
useEffect(() => {
  async function verifyAuth() {
    if (token && !user) {
      try {
        const userData = await apiClient<any>('/users/me');
        setUser(userData);
      } catch (err) {
        logout(); // Token expired or invalid
        router.push('/auth/sign-in');
      }
    }
  }
  verifyAuth();
}, [token, user]);
```

## 3. Best Practices Implemented
- **Loading States**: Added feedback to the UI during API calls.
- **Error Handling**: Captured and displayed backend error messages to the user.
- **Security**: JWT is kept in the Zustand store (vulnerable to XSS but standard for many SPAs). For higher security, consider using HttpOnly cookies.
- **Hydration Safety**: Added `isMounted` checks to prevent hydration mismatches in Next.js.
