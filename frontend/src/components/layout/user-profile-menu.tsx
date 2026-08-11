'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, type User } from '@/lib/auth-store';
import { confirmLogout, showToast } from '@/lib/notifications';

interface UserProfileMenuProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  contentClassName?: string;
}

function getDisplayName(user: User): string {
  return user.full_name || user.name || user.email;
}

function getInitials(user: User): string {
  const name = getDisplayName(user);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return initials || user.email.slice(0, 2).toUpperCase();
}

function formatRole(role: User['role']): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function UserProfileMenu({
  children,
  align = 'end',
  contentClassName
}: UserProfileMenuProps) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = async () => {
    if (!(await confirmLogout())) return;
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Always clear local session even if revoke/clear-cookie call fails.
    } finally {
      logout();
      showToast('success', 'Signed out successfully');
      router.push('/auth/sign-in');
    }
  };

  const handleSwitchRole = async (role: string) => {
    if (!user || role === user.role) return;
    try {
      const data = await apiClient<{ user: User }>('/auth/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role })
      });
      setUser(data.user);
      showToast('success', `Switched to ${formatRole(role)}`);
      // Full reload: every role-gated nav item / query needs to refetch
      // against the new role, not just this menu's local state.
      window.location.href = '/dashboard';
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to switch role');
    }
  };

  if (!user) return null;

  const otherRoles = (user.availableRoles ?? []).filter((r) => r !== user.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={8}
        className={contentClassName || 'w-64 rounded-xl p-2'}
      >
        <DropdownMenuLabel className='p-2 font-normal'>
          <div className='flex min-w-0 items-center gap-3 rounded-lg bg-muted/60 p-2'>
            <Avatar className='size-10 border border-border bg-background'>
              <AvatarFallback className='bg-primary/10 text-sm font-semibold text-primary'>
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-semibold'>{getDisplayName(user)}</p>
              <p className='truncate text-xs text-muted-foreground'>{formatRole(user.role)}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => router.push('/dashboard/profile')}>
            <Icons.account />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/dashboard/notifications')}>
            <Icons.notification />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {otherRoles.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className='px-2 pb-1 pt-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Switch role
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {otherRoles.map((role) => (
                <DropdownMenuItem key={role} onSelect={() => handleSwitchRole(role)}>
                  <Icons.refresh />
                  {formatRole(role)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onSelect={handleLogout}>
          <Icons.logout />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
