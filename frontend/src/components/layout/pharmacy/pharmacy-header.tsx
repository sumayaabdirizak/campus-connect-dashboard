'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import SearchInput from '@/components/search-input';
import { useKBar } from 'kbar';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { HeaderUserAvatar } from '../header/header-user-avatar';
import { sidebarToggleClass, topbarLinkClass } from './pharmacy-ui';

type PharmacyHeaderProps = {
  onMobileMenu: () => void;
  onToggleSidebar: () => void;
};

export function PharmacyHeader({ onMobileMenu, onToggleSidebar }: PharmacyHeaderProps) {
  const items = useBreadcrumbs();
  const title = items.at(-1)?.title ?? 'Dashboard';
  const { query } = useKBar();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <header className='sticky top-0 z-20 min-h-[50px] border-b border-border bg-background px-3 sm:px-4 lg:px-6'>
      <div className='flex min-h-[50px] items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <button
            type='button'
            id='mobile_btn'
            className={cn(topbarLinkClass, 'lg:hidden')}
            onClick={onMobileMenu}
            aria-label='Open sidebar menu'
          >
            <Icons.panelLeft className='size-4' />
          </button>

          <button
            type='button'
            id='toggle_btn2'
            className={cn(sidebarToggleClass, 'hidden lg:inline-flex')}
            onClick={onToggleSidebar}
            aria-label='Toggle sidebar width'
          >
            <Icons.chevronRight className='size-4' />
          </button>

          <h4 className='mb-0 truncate text-base font-semibold'>{title}</h4>
        </div>

        <div className='flex shrink-0 items-center gap-2'>
          <div className='hidden lg:block'>
            <SearchInput variant='pharmacy' className='min-w-[200px]' />
          </div>

          <button
            type='button'
            className={cn(topbarLinkClass, 'lg:hidden')}
            onClick={query.toggle}
            aria-label='Open search'
          >
            <Icons.search className='size-4' />
          </button>

          <button
            type='button'
            className={topbarLinkClass}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Icons.sun className='size-[18px]' /> : <Icons.moon className='size-[18px]' />}
          </button>

          <NotificationCenter variant='pharmacy' />

          <Link href='/dashboard/profile' className={topbarLinkClass} aria-label='Settings'>
            <Icons.settings className='size-[18px]' />
          </Link>

          <HeaderUserAvatar variant='pharmacy' />
        </div>
      </div>
    </header>
  );
}
