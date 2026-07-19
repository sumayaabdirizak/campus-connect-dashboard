'use client';

import { Icons } from '@/components/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from '@/components/ui/sidebar';
import { useAnnouncementUnreadCount } from '@/features/announcements/api/queries';
import { AppSidebarNav } from './app-sidebar/app-sidebar-nav';
import { AppSidebarUserMenu } from './app-sidebar/app-sidebar-user-menu';

export default function AppSidebar() {
  const { data: unreadData } = useAnnouncementUnreadCount();
  const unreadCount = unreadData?.unreadCount ?? 0;

  return (
    <Sidebar collapsible='icon' data-sidebar='root' className='border-r border-sidebar-border/70'>
      <SidebarHeader className='border-b border-sidebar-border/70 px-3 py-3 group-data-[collapsible=icon]:px-1.5'>
        <div className='flex h-12 items-center gap-3 overflow-hidden rounded-xl px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 group-data-[collapsible=icon]:size-9'>
            <Icons.student className='size-5' aria-hidden='true' />
          </div>
          <div className='grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden'>
            <span className='truncate font-display text-[15px] font-bold tracking-tight'>
              Campus Connect
            </span>
            <span className='truncate text-[11px] text-sidebar-foreground/55'>
              Jazeera University
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className='overflow-x-hidden px-1 py-2'>
        <AppSidebarNav unreadCount={unreadCount} />
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border/70 p-2.5 group-data-[collapsible=icon]:p-1.5'>
        <AppSidebarUserMenu />
      </SidebarFooter>
      <SidebarRail className='hover:after:bg-primary/40' />
    </Sidebar>
  );
}
