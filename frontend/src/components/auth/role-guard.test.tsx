// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
// @ts-ignore - screen/waitFor exported from dom which isn't in types
import { screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/lib/auth-store';
import { RoleGuard } from './role-guard';

const push = vi.fn();
let pathname = '/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => pathname
}));

// role-guard.tsx caches the last session-check result for 45s in a
// module-level variable, keyed off Date.now(). Advance the clock past that
// TTL before each test so every test gets a fresh validateSession() call
// instead of reusing the previous test's cached result.
let fakeNow = Date.now();

function renderGuardAt(path: string) {
  pathname = path;
  fakeNow += 60_000;
  vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);
  return render(
    <RoleGuard>
      <div>protected content</div>
    </RoleGuard>
  );
}

describe('RoleGuard', () => {
  beforeEach(() => {
    push.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('redirects to sign-in when the session is not authenticated', async () => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      validateSession: vi.fn().mockResolvedValue(false),
      clearAuth: vi.fn()
    });

    renderGuardAt('/dashboard/admin/roles');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/auth/sign-in'));
    // Children never render for an unauthenticated visitor — the guard shows
    // its loading spinner in place of them for the whole unauthenticated window.
    expect(screen.queryByText('protected content')).toBeNull();
  });

  it('blocks a STUDENT from a SUPER_ADMIN-only route and redirects to /dashboard', async () => {
    useAuthStore.setState({
      user: { id: 1, email: 'student@example.edu', role: 'STUDENT' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true)
    });

    renderGuardAt('/dashboard/admin/roles');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('allows a SUPER_ADMIN into a SUPER_ADMIN-only route', async () => {
    useAuthStore.setState({
      user: { id: 1, email: 'admin@example.edu', role: 'SUPER_ADMIN' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true)
    });

    renderGuardAt('/dashboard/admin/roles');

    await waitFor(() => expect(screen.getByText('protected content')).not.toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('always allows the /dashboard index regardless of role (redirect target for denied routes)', async () => {
    useAuthStore.setState({
      user: { id: 1, email: 'student@example.edu', role: 'STUDENT' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true)
    });

    renderGuardAt('/dashboard');

    await waitFor(() => expect(screen.getByText('protected content')).not.toBeNull());
    expect(push).not.toHaveBeenCalled();
  });

  it('allows any authenticated role into an unrestricted route', async () => {
    useAuthStore.setState({
      user: { id: 1, email: 'student@example.edu', role: 'STUDENT' },
      isAuthenticated: true,
      validateSession: vi.fn().mockResolvedValue(true)
    });

    renderGuardAt('/dashboard/messages');

    await waitFor(() => expect(screen.getByText('protected content')).not.toBeNull());
    expect(push).not.toHaveBeenCalled();
  });
});
