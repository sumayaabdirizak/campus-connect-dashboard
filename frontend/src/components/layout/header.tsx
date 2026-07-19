'use client';

import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icons } from '@/components/icons';
import SearchInput from '@/components/search-input';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { ThemeSelector } from '@/components/themes/theme-selector';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useInbox } from '@/features/inbox/api/inbox-queries';
import { NotificationCenter } from '@/features/notifications/components/notification-center';
import { useAuthStore } from '@/lib/auth-store';
import { UserProfileMenu } from './user-profile-menu';

function MessageShortcut() {
  const { data } = useInbox();
  const unreadCount = data?.totalUnread ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant='outline'
          size='icon'
          className='relative size-9 rounded-full bg-background shadow-none'
        >
          <Link href='/dashboard/messages' aria-label='Open messages'>
            <Icons.chat className='size-4' aria-hidden='true' />
            {unreadCount > 0 && (
              <span className='absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground ring-2 ring-background'>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Messages</TooltipContent>
    </Tooltip>
  );
}

function HeaderUserMenu() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  const displayName = user.full_name || user.name || user.email;
  const role = user.role.replaceAll('_', ' ').toLowerCase();

  return (
    <UserProfileMenu>
      <Button
        variant='ghost'
        className='h-11 max-w-56 gap-2 rounded-xl px-1.5 hover:bg-muted data-[state=open]:bg-muted sm:pr-2'
        aria-label='Open user menu'
      >
        <UserAvatarProfile className='size-9' user={user} />
        <span className='hidden min-w-0 text-left leading-tight xl:block'>
          <span className='block max-w-32 truncate text-sm font-semibold'>{displayName}</span>
          <span className='block text-xs capitalize text-muted-foreground'>{role}</span>
        </span>
        <Icons.chevronDown
          className='hidden size-4 text-muted-foreground xl:block'
          aria-hidden='true'
        />
      </Button>
    </UserProfileMenu>
  );
}

export default function Header() {
  return (
    <header
      data-dashboard-header
      className='sticky top-0 z-20 flex h-17 shrink-0 items-center gap-3 border-b bg-background/95 px-3 shadow-[0_1px_0_0_color-mix(in_oklch,var(--border)_70%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:px-4 lg:px-6'
    >
      <div className='flex min-w-0 shrink items-center gap-2 sm:gap-3'>
        <SidebarTrigger
          className='size-9 shrink-0 rounded-full border border-border bg-background shadow-none'
          aria-label='Toggle navigation sidebar'
        />
        <Separator orientation='vertical' className='hidden h-6 sm:block' />
        <div className='min-w-0 overflow-hidden'>
          <Breadcrumbs />
        </div>
      </div>

      <div className='hidden min-w-0 flex-1 justify-center md:flex'>
        <SearchInput />
      </div>

      <div className='ml-auto flex shrink-0 items-center gap-1 sm:gap-2'>
        <div className='hidden xl:block'>
          <ThemeSelector />
        </div>
        <ThemeModeToggle />
        <MessageShortcut />
        <NotificationCenter />
        <Separator orientation='vertical' className='mx-0.5 hidden h-7 sm:block' />
        <HeaderUserMenu />
      </div>
    </header>
  );
}
