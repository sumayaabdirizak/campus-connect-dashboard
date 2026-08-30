'use client';

import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { useAnnouncementUnreadCount } from '@/lib/announcements/queries';
import { SidebarBrandLogo } from './sidebar-brand-logo';
import { PharmacySidebarMenu } from './pharmacy-sidebar-menu';

type PharmacySidebarProps = {
  expanded: boolean;
  mobileOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function PharmacySidebar({
  expanded,
  mobileOpen,
  onMouseEnter,
  onMouseLeave
}: PharmacySidebarProps) {
  const { data } = useAnnouncementUnreadCount();
  const unreadCount = data?.unreadCount ?? 0;
  const collapsed = !expanded;

  return (
    <aside
      id='sidebar'
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'fixed inset-y-0 left-0 z-[99] flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out',
        expanded ? 'w-60' : 'w-[70px]',
        'max-lg:-translate-x-full max-lg:transition-transform max-lg:duration-300',
        mobileOpen && 'max-lg:translate-x-0'
      )}
    >
      <div className='shrink-0 border-b border-sidebar-border py-0.5'>
        <SidebarBrandLogo className={cn(collapsed && 'hidden')} />
        <SidebarBrandLogo mini className={cn(!collapsed && 'hidden')} />
      </div>

      <div className='flex-1 overflow-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        <Suspense fallback={null}>
          <PharmacySidebarMenu mini={collapsed} unreadCount={unreadCount} />
        </Suspense>
      </div>
    </aside>
  );
}

