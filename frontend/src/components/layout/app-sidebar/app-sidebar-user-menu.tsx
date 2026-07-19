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
        <UserProfileMenu contentClassName='w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl p-2'>
          <SidebarMenuButton
            size='lg'
            className='h-14 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 px-2.5 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent'
          >
            <UserAvatarProfile className='size-9 rounded-lg' showInfo user={user} />
            <Icons.chevronsDown className='ml-auto size-4 text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden' />
          </SidebarMenuButton>
        </UserProfileMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
