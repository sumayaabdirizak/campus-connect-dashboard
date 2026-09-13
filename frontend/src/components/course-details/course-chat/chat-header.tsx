'use client';

import { Avatar, AvatarFallback } from '@/features/ui/components/avatar';
import { avatarGradient } from '@/lib/discussions/services/avatar-color';
import { initialsOf } from './chat-utils';

interface ChatHeaderProps {
  roomName?: string;
  courseCode?: string;
  messageCount: number;
  presence: Array<{ userId: number; full_name: string }>;
}

export function ChatHeader({
  roomName,
  courseCode,
  messageCount,
  presence
}: ChatHeaderProps) {
  const title = courseCode ? `${courseCode} chat` : roomName || 'Course chat';

  return (
    <div className='shrink-0 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 dark:border-border dark:bg-muted/30'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='truncate text-base font-semibold text-[#101828] dark:text-foreground'>
            {title}
          </h3>
          <p className='text-xs text-[#667085] dark:text-muted-foreground'>
            {messageCount} message{messageCount === 1 ? '' : 's'} · {presence.length} online
          </p>
        </div>
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
      </div>
    </div>
  );
}
