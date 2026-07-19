'use client';

import { Icons } from '@/components/icons';
import { UserProfileMenu } from '@/components/layout/user-profile-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { useAuthStore } from '@/lib/auth-store';

export function AppSidebarUserMenu() {
  const user = useAuthStore((state) => state.user);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserProfileMenu contentClassName='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg p-2'>
          <SidebarMenuButton
            size='lg'
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <UserAvatarProfile className='size-8 rounded-lg' showInfo user={user} />
            <Icons.chevronsDown className='ml-auto size-4' />
          </SidebarMenuButton>
        </UserProfileMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
