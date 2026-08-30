'use client';

import { Announcement } from '@/lib/announcements/types';

interface AnnouncementHeaderProps {
  announcement: Announcement;
}

function authorInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AnnouncementHeader({ announcement }: AnnouncementHeaderProps) {
  const authorName =
    announcement.createdBy?.name || announcement.author?.full_name || 'Campus Connect';
  const initials = authorInitials(authorName) || 'CC';
  const avatarUrl =
    announcement.author?.avatarUrl || announcement.createdBy?.avatarUrl || undefined;

  return (
    <div className='flex min-w-0 items-center gap-2'>
      <div
        className='flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/25 text-[10px] font-semibold text-primary'
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt='' className='h-full w-full object-cover' />
        ) : (
          initials
        )}
      </div>
      <p className='truncate text-xs font-semibold text-foreground'>{authorName}</p>
    </div>
  );
}
