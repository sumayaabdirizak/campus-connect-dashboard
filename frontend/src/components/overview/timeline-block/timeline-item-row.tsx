'use client';

import { format } from 'date-fns';
import { Button } from '@/features/ui/components/button';
import {
  ACTION_BY_AUDIENCE,
  TIMELINE_ICON,
  timelineHrefFor,
  type TimelineItem,
} from './types';

export function TimelineItemRow({
  item,
  audience,
}: {
  item: TimelineItem;
  audience: 'student' | 'teacher';
}) {
  const Icon = TIMELINE_ICON[item.kind];
  const when = item.deadlineAt ? new Date(item.deadlineAt) : null;
  const action = ACTION_BY_AUDIENCE[audience];
  const href = timelineHrefFor(item);

  return (
    <li className='flex items-center gap-3 px-4 py-3'>
      <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
        <Icon className='size-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-xs text-muted-foreground'>
          {when ? format(when, 'h:mm a') : ''}
        </p>
        <a
          href={href}
          className='block truncate text-sm font-medium text-primary hover:underline'
        >
          {item.title}
        </a>
        <p className='truncate text-xs text-muted-foreground'>
          {item.courseCode ?? ''}
        </p>
      </div>
      <Button asChild variant='outline' size='sm' className='shrink-0'>
        <a href={href}>{action[item.kind]}</a>
      </Button>
    </li>
  );
}
