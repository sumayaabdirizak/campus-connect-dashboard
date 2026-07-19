'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { avatarGradient } from '@/features/discussions/utils/avatar-color';
import { initialsOf } from './chat-utils';

interface ChatHeaderProps {
  roomName?: string;
  messageCount: number;
  presence: Array<{ userId: number; full_name: string }>;
  isConnected: boolean;
}

export function ChatHeader({
  roomName,
  messageCount,
  presence,
  isConnected
}: ChatHeaderProps) {
  return (
    <div className='border-b bg-muted/20 px-4 py-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='truncate text-base font-semibold'>{roomName || 'Course Chat'}</h3>
          <p className='text-xs text-muted-foreground'>
            {messageCount} message{messageCount === 1 ? '' : 's'} · {presence.length} online
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {presence.length > 0 ? (
            <div className='flex -space-x-2'>
              {presence.slice(0, 5).map((person) => (
                <Avatar
                  key={person.userId}
                  title={`${person.full_name} online`}
                  className='size-8 ring-2 ring-emerald-500'
                >
                  <AvatarFallback
                    className='text-[11px] font-semibold text-white'
                    style={{ background: avatarGradient(person.full_name) }}
                  >
                    {initialsOf(person.full_name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {presence.length > 5 ? (
                <span className='inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold ring-2 ring-background'>
                  +{presence.length - 5}
                </span>
              ) : null}
            </div>
          ) : null}
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={cn(isConnected && 'bg-emerald-600 text-white hover:bg-emerald-600')}
          >
            {isConnected ? <Wifi className='mr-1 size-3' /> : <WifiOff className='mr-1 size-3' />}
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
      </div>
    </div>
  );
}
