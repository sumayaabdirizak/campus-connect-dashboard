'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { confirmLogout, showToast } from '@/lib/notifications';
import { Icons } from '@/components/icons';

export function AppSidebarUserMenu() {
  const user = useAuthStore((state) => state.user);
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              {user && <UserAvatarProfile className='h-8 w-8 rounded-lg' showInfo user={user} />}
              {Icons.chevronsDown || Icons.chevronDown
                ? React.createElement(Icons.chevronsDown || Icons.chevronDown, {
                    className: 'ml-auto size-4'
                  })
                : null}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side='bottom'
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='px-1 py-1.5'>
                {user && <UserAvatarProfile className='h-8 w-8 rounded-lg' showInfo user={user} />}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                {Icons.account && <Icons.account className='mr-2 h-4 w-4' />}
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')}>
                {Icons.notification && <Icons.notification className='mr-2 h-4 w-4' />}
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              {Icons.logout && <Icons.logout className='mr-2 h-4 w-4' />}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
