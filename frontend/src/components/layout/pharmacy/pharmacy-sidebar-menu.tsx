'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { NavItem } from '@/types';

function pathOf(url: string): string {
  return url.split('?')[0];
}

function queryParamOf(url: string, key: string): string | null {
  const q = url.split('?')[1];
  if (!q) return null;
  return new URLSearchParams(q).get(key);
}

function isItemActive(
  pathname: string,
  url: string,
  currentScope: string | null,
  currentRole: string | null
): boolean {
  const path = pathOf(url);
  if (path === '/dashboard') return pathname === path;
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;

  const itemScope = queryParamOf(url, 'scope');
  if (itemScope) return currentScope === itemScope;

  const itemRole = queryParamOf(url, 'role');
  if (itemRole) return (currentRole ?? '').toUpperCase() === itemRole.toUpperCase();

  // Plain /dashboard/users should not stay active when a role filter is selected
  if (path === '/dashboard/users' && currentRole) return false;

  return true;
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

function SidebarNavLink({
  item,
  mini,
  unreadCount,
  pathname,
  currentScope,
  currentRole,
  nested = false
}: {
  item: NavItem;
  mini: boolean;
  unreadCount: number;
  pathname: string;
  currentScope: string | null;
  currentRole: string | null;
  nested?: boolean;
}) {
  const Icon = item.icon ? Icons[item.icon] : Icons.logo;
  const active = isItemActive(pathname, item.url, currentScope, currentRole);

  return (
    <Link
      href={item.url}
      role='menuitem'
      className={cn(
        'group flex items-center gap-2 rounded-xl border border-transparent p-2 text-sm font-medium text-sidebar-foreground no-underline transition-colors',
        'hover:border-sidebar-border hover:bg-sidebar-accent',
        active && 'border-primary/30 bg-sidebar-accent text-primary',
        nested && 'py-1.5 pl-2 text-[13px] font-normal',
        mini && !nested && 'h-[38px] justify-center'
      )}
    >
      {!nested ? <MenuIcon icon={Icon} active={active} /> : null}
      <span className={cn('truncate', mini && !nested && 'sr-only')}>{item.title}</span>
      {item.url === '/dashboard/announcements' && unreadCount > 0 && !mini && !nested ? (
        <span className='ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground'>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function pathSubtreeActive(
  item: NavItem,
  pathname: string,
  currentScope: string | null,
  currentRole: string | null
): boolean {
  if (isItemActive(pathname, item.url, currentScope, currentRole)) return true;
  return (item.items ?? []).some((c) =>
    pathSubtreeActive(c, pathname, currentScope, currentRole)
  );
}

function SidebarNavParent({
  item,
  mini,
  pathname,
  currentScope,
  currentRole,
  nested = false
}: {
  item: NavItem;
  mini: boolean;
  pathname: string;
  currentScope: string | null;
  currentRole: string | null;
  nested?: boolean;
}) {
  const children = item.items ?? [];
  const Icon = item.icon ? Icons[item.icon] : Icons.logo;
  const parentActive = pathSubtreeActive(item, pathname, currentScope, currentRole);
  const reportsSection =
    pathname.startsWith('/dashboard/reports') ||
    pathname === '/dashboard/admin/report' ||
    pathname.startsWith('/dashboard/faculty-dean/reports');

  const [open, setOpen] = useState(parentActive || reportsSection);

  useEffect(() => {
    if (parentActive || reportsSection) setOpen(true);
  }, [parentActive, reportsSection]);

  if (mini) {
    return (
      <Link
        href={item.url}
        className={cn(
          'group flex h-[38px] items-center justify-center rounded-xl border border-transparent p-2 transition-colors',
          'hover:border-sidebar-border hover:bg-sidebar-accent',
          parentActive && 'border-sidebar-border bg-sidebar-accent'
        )}
        title={item.title}
      >
        <MenuIcon icon={Icon} active={parentActive} />
      </Link>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type='button'
          className={cn(
            'group flex w-full items-center gap-2 rounded-xl border border-transparent p-2 text-sm font-medium text-sidebar-foreground transition-colors',
            'hover:border-sidebar-border hover:bg-sidebar-accent',
            open && 'border-primary/30',
            parentActive && 'border-primary/30 bg-sidebar-accent',
            nested && 'py-1.5 pl-2 text-[13px] font-normal'
          )}
        >
          {!nested ? <MenuIcon icon={Icon} active={parentActive} /> : null}
          <span className='truncate'>{item.title}</span>
          <ChevronDown
            className={cn(
              'ml-auto size-4 shrink-0 text-sidebar-muted transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul
          className={cn(
            'm-0 mt-1 list-none border-l border-primary/40 py-0.5 pl-2 space-y-0.5',
            nested ? 'ml-3' : 'ml-5'
          )}
        >
          {children.map((child) => {
            const hasChildren = (child.items?.length ?? 0) > 0;
            return (
              <li key={`${child.title}-${child.url}`}>
                {hasChildren ? (
                  <SidebarNavParent
                    item={child}
                    mini={mini}
                    pathname={pathname}
                    currentScope={currentScope}
                    currentRole={currentRole}
                    nested
                  />
                ) : (
                  <SidebarNavLink
                    item={child}
                    mini={mini}
                    unreadCount={0}
                    pathname={pathname}
                    currentScope={currentScope}
                    currentRole={currentRole}
                    nested
                  />
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
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
  const searchParams = useSearchParams();
  const currentScope = searchParams?.get('scope') ?? null;
  const currentRole = searchParams?.get('role') ?? null;
  const groups = useFilteredNavGroups(navGroups);

  return (
    <nav id='sidebar-menu' aria-label='Main navigation menu'>
      <ul className='m-0 list-none p-0'>
        {groups.flatMap((group, groupIndex) => {
          const titleItem = group.label ? (
            <li
              key={`${groupIndex}-${group.label}-title`}
              className={cn('mt-3 px-2 first:mt-0', mini && 'hidden')}
            >
              <span className='block py-1.5 text-xs font-medium text-sidebar-muted'>
                {group.label}
              </span>
            </li>
          ) : null;

          const links = group.items.map((item) => {
            const hasChildren = item.items && item.items.length > 0;
            return (
              <li key={`${groupIndex}-${item.url}`} className='mt-1 first:mt-0'>
                {hasChildren ? (
                  <SidebarNavParent
                    item={item}
                    mini={mini}
                    pathname={pathname}
                    currentScope={currentScope}
                    currentRole={currentRole}
                  />
                ) : (
                  <SidebarNavLink
                    item={item}
                    mini={mini}
                    unreadCount={unreadCount}
                    pathname={pathname}
                    currentScope={currentScope}
                    currentRole={currentRole}
                  />
                )}
              </li>
            );
          });

          return titleItem ? [titleItem, ...links] : links;
        })}
      </ul>
    </nav>
  );
}
