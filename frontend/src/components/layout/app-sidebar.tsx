'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAnnouncementUnreadCount } from '@/features/announcements/api/queries';
import * as React from 'react';
import { Icons } from '@/components/icons';
import { AppSidebarNav } from './app-sidebar/app-sidebar-nav';
import { AppSidebarUserMenu } from './app-sidebar/app-sidebar-user-menu';

export default function AppSidebar() {
  const { isOpen } = useMediaQuery();
  const { data: unreadData } = useAnnouncementUnreadCount();
  const unreadCount = unreadData?.unreadCount ?? 0;

  React.useEffect(() => {
    // Side effects based on sidebar state changes
  }, [isOpen]);

  return (
    <Sidebar collapsible='icon' data-sidebar='root'>
      <SidebarHeader className='border-b border-sidebar-border/60 group-data-[collapsible=icon]:pt-4'>
        <div className='flex items-center gap-3 px-2 py-2'>
          <div className='flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'>
            <Icons.logo className='size-4' />
          </div>
          <div className='grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='truncate text-sm font-semibold'>Campus Connect</span>
            <span className='truncate text-[11px] text-muted-foreground'>Academic Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className='overflow-x-hidden'>
        <AppSidebarNav unreadCount={unreadCount} />
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border/60'>
        <AppSidebarUserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
