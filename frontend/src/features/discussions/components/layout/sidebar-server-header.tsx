'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { DiscussionServer } from '../../api/types';

export function SidebarServerHeader({
  server,
  isLoading
}: {
  server: DiscussionServer | null | undefined;
  isLoading?: boolean;
}) {
  return (
    <div className='flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4'>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-semibold leading-none'>
          {isLoading ? '…' : server?.name ?? 'Select a workspace'}
        </div>
        {server?.scopeType ? (
          <div className='mt-1 truncate text-xs text-muted-foreground'>
            {server.scopeType}
          </div>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            aria-label='Workspace menu'
            disabled={!server}
          >
            <Icons.chevronDown className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Invite people</DropdownMenuItem>
          <DropdownMenuItem disabled>Workspace settings</DropdownMenuItem>
          <DropdownMenuItem disabled>Notification preferences</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
