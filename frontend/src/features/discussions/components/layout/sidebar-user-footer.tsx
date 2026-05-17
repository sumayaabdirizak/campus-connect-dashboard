'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/lib/auth-store';
import { useMyDiscussionStatus } from '../../api/queries';
import { PresenceDot } from '../details/presence-dot';
import { StatusSetterPopover } from './status-setter-popover';

function initialsFor(name: string | undefined | null, email: string | undefined): string {
  const source = name || email || '';
  const parts = source.trim().split(/\s+|@/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function isDndStatus(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  return t === 'dnd' || t === 'do not disturb' || t.includes('do not disturb');
}

export function SidebarUserFooter() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.full_name ?? user?.name ?? user?.email ?? 'Signed out';
  const { data: statusData } = useMyDiscussionStatus();
  const status = statusData?.discussionCustomStatus ?? null;
  // The dot reflects DND immediately; "online" is implicit while we have a
  // working socket. Offline is not shown for self.
  const myPresenceState = isDndStatus(status) ? 'dnd' : 'online';

  return (
    <div className='flex h-14 shrink-0 items-center gap-2 border-t bg-muted/40 px-3'>
      <div className='relative'>
        <Avatar className='h-8 w-8'>
          <AvatarFallback className='text-xs'>
            {initialsFor(user?.full_name ?? user?.name, user?.email)}
          </AvatarFallback>
        </Avatar>
        {user && <PresenceDot state={myPresenceState} />}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-xs font-medium leading-tight'>{displayName}</div>
        {/* Show the custom status when set, otherwise fall back to email. */}
        {status ? (
          <div className='truncate text-[11px] text-muted-foreground'>{status}</div>
        ) : user?.email ? (
          <div className='truncate text-[11px] text-muted-foreground'>{user.email}</div>
        ) : null}
      </div>
      <StatusSetterPopover
        current={status}
        trigger={
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            aria-label='Set custom status'
          >
            <Icons.edit className='h-4 w-4' />
          </Button>
        }
      />
    </div>
  );
}
