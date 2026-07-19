'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { deadlineRowToCalendarInput } from '@/features/calendar/deadline-calendar';
import {
  ACTION_BY_AUDIENCE,
  TIMELINE_ICON,
  timelineHrefFor,
  type TimelineItem
} from './types';

export function TimelineItemRow({
  item,
  audience
}: {
  item: TimelineItem;
  audience: 'student' | 'teacher';
}) {
  const Icon = TIMELINE_ICON[item.kind];
  const when = item.deadlineAt ? new Date(item.deadlineAt) : null;
  const action = ACTION_BY_AUDIENCE[audience];
  const deadline = deadlineRowToCalendarInput(item);

  return (
    <li className='flex items-center gap-3 px-4 py-3'>
      <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
        <Icon className='size-4' />
      </span>
      <div className='min-w-0 flex-1'>
        <p className='text-xs text-muted-foreground'>{when ? format(when, 'h:mm a') : ''}</p>
        <Link
          href={timelineHrefFor(item)}
          className='block truncate text-sm font-medium text-primary hover:underline'
        >
          {item.title}
        </Link>
        <p className='truncate text-xs text-muted-foreground'>{item.courseCode ?? ''}</p>
      </div>
      <div className='flex shrink-0 flex-col items-end gap-1.5'>
        {deadline ? (
          <AddToCalendarButton deadline={deadline} className='text-[11px] text-muted-foreground' />
        ) : null}
        <Button asChild variant='outline' size='sm'>
          <Link href={timelineHrefFor(item)}>{action[item.kind]}</Link>
        </Button>
      </div>
    </li>
  );
}
