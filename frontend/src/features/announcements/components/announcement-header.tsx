'use client';

import React, { useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Announcement } from '../api/types';

interface AnnouncementHeaderProps {
  announcement: Announcement;
}

function normalizeRole(role: string): string {
  const u = String(role).toUpperCase();
  return u === 'LECTURER' ? 'TEACHER' : u;
}

function isStaffRole(role: string): boolean {
  const r = normalizeRole(role);
  return r === 'TEACHER' || r === 'DEAN' || r === 'SUPER_ADMIN';
}

export function AnnouncementHeader({ announcement }: AnnouncementHeaderProps) {
  const createdAt = announcement.createdAt || announcement.created_at || new Date().toISOString();
  const roleRaw = String(
    announcement.createdBy?.role || announcement.author?.role?.type || ''
  ).toUpperCase();
  const authorName =
    announcement.createdBy?.name || announcement.author?.full_name || 'Campus Connect';
  const initials = authorName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const avatarUrl =
    announcement.author?.avatarUrl || announcement.createdBy?.avatarUrl || undefined;

  const audienceBadge = useMemo(() => {
    if (!roleRaw) return null;
    if (isStaffRole(roleRaw)) {
      return (
        <Badge
          variant='outline'
          className='h-5 border-primary/25 bg-primary/5 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary'
        >
          Staff
        </Badge>
      );
    }
    if (normalizeRole(roleRaw) === 'STUDENT') {
      return (
        <Badge
          variant='outline'
          className='h-5 border-border bg-muted/60 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
        >
          Student
        </Badge>
      );
    }
    return null;
  }, [roleRaw]);

  return (
    <div className='flex items-start gap-2.5'>
      <Avatar className='size-9 shrink-0 ring-1 ring-border'>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt='' className='object-cover' />
        ) : null}
        <AvatarFallback className='bg-muted text-xs font-medium text-muted-foreground'>
          {initials || 'CC'}
        </AvatarFallback>
      </Avatar>
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[15px] leading-snug'>
          <span className='font-semibold text-foreground'>{authorName}</span>
          {audienceBadge}
          <span className='text-muted-foreground' aria-hidden>
            ·
          </span>
          <span className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            {roleRaw || '—'}
          </span>
          <span className='text-muted-foreground' aria-hidden>
            ·
          </span>
          <span className='text-xs tabular-nums text-muted-foreground'>
            {formatDistanceToNowStrict(new Date(createdAt), { addSuffix: false })}
          </span>
          {announcement.isNew && (
            <>
              <span className='text-muted-foreground' aria-hidden>
                ·
              </span>
              <span
                className='inline-flex size-2 shrink-0 rounded-full bg-primary ring-2 ring-background'
                aria-label='new announcement'
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
