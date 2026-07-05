'use client';

import { formatDistanceToNow } from 'date-fns';
import type { PlatformAnalytics } from '@/features/admin/api/admin-api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function activityStatus(type: string): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  switch (type) {
    case 'registration':
      return { label: 'New', variant: 'default' };
    case 'submission':
      return { label: 'Submitted', variant: 'secondary' };
    case 'quiz':
      return { label: 'Quiz', variant: 'outline' };
    default:
      return { label: 'Activity', variant: 'outline' };
  }
}

export function DashboardActivityTimeline({
  items,
  loading,
}: {
  items: PlatformAnalytics['recentActivity'];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className='space-y-3'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='flex gap-3'>
            <Skeleton className='size-9 shrink-0 rounded-full' />
            <div className='flex-1 space-y-2'>
              <Skeleton className='h-4 w-3/4' />
              <Skeleton className='h-3 w-1/3' />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className='rounded-xl border border-dashed py-12 text-center'>
        <p className='text-muted-foreground text-sm'>No recent activity yet.</p>
        <p className='text-muted-foreground mt-1 text-xs'>
          Platform actions will appear here as users interact with the system.
        </p>
      </div>
    );
  }

  return (
    <ol className='relative space-y-0'>
      {items.map((item, index) => {
        const status = activityStatus(item.type);
        const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
        return (
          <li key={item.id} className='relative flex gap-3 pb-6 last:pb-0'>
            {index < items.length - 1 ? (
              <span
                className='bg-border absolute left-[17px] top-9 h-[calc(100%-1.25rem)] w-px'
                aria-hidden
              />
            ) : null}
            <Avatar className='size-9 shrink-0 border'>
              <AvatarFallback className='text-[10px]'>{initials(item.user || '?')}</AvatarFallback>
            </Avatar>
            <div className='min-w-0 flex-1 pt-0.5'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{item.user}</p>
                  <p className='text-muted-foreground mt-0.5 text-sm'>{item.action}</p>
                </div>
                <Badge variant={status.variant} className='shrink-0 capitalize'>
                  {status.label}
                </Badge>
              </div>
              <p className={cn('text-muted-foreground mt-1 text-xs')}>{timeAgo}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
