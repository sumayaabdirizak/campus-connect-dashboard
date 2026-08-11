'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';

function isRouteActive(pathname: string, url: string): boolean {
  if (url === '/dashboard') return pathname === url;
  return pathname === url || pathname.startsWith(`${url}/`);
}

function MenuIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-sidebar-icon transition-colors',
        'group-hover:bg-primary group-hover:text-primary-foreground',
        active && 'bg-primary text-primary-foreground'
      )}
    >
      <Icon className='size-4' aria-hidden='true' />
    </span>
  );
}

export function PharmacySidebarMenu({
  mini,
  unreadCount
}: {
  mini: boolean;
  unreadCount: number;
}) {
  const pathname = usePathname();
  const groups = useFilteredNavGroups(navGroups);

  return (
    <nav id='sidebar-menu' aria-label='Main navigation menu'>
      <ul className='m-0 list-none p-0'>
        {groups.flatMap((group) => {
          const titleItem = group.label ? (
            <li
              key={`${group.label}-title`}
              className={cn('mt-3 px-2 first:mt-0', mini && 'hidden')}
            >
              <span className='block py-1.5 text-xs font-medium text-sidebar-muted'>
                {group.label}
              </span>
            </li>
          ) : null;

          const links = group.items.map((item) => {
            const Icon = item.icon ? Icons[item.icon] : Icons.logo;
            const active = isRouteActive(pathname, item.url);
            return (
              <li key={item.title} className='mt-1 first:mt-0'>
                <Link
                  href={item.url}
                  role='menuitem'
                  className={cn(
                    'group flex items-center gap-2 rounded-xl border border-transparent p-2 text-sm font-medium text-sidebar-foreground no-underline transition-colors',
                    'hover:border-sidebar-border hover:bg-sidebar-accent',
                    active && 'border-sidebar-border bg-sidebar-accent',
                    mini && 'h-[38px] justify-center'
                  )}
                >
                  <MenuIcon icon={Icon} active={active} />
                  <span className={cn('truncate', mini && 'sr-only')}>{item.title}</span>
                  {item.url === '/dashboard/announcements' && unreadCount > 0 && !mini ? (
                    <span className='ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground'>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          });

          return titleItem ? [titleItem, ...links] : links;
        })}
      </ul>
    </nav>
  );
}
