'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePersonalEvent } from '@/features/calendar/api';
import {
  buildDeadlineCalendarNotes,
  deadlineTitleForCalendar,
  markDeadlineAddedLocally,
  wasDeadlineAddedLocally,
  type DeadlineCalendarInput,
} from '@/features/calendar/deadline-calendar';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { cn } from '@/lib/utils';

type AddToCalendarButtonProps = {
  deadline: DeadlineCalendarInput;
  className?: string;
  label?: string;
};

export function AddToCalendarButton({
  deadline,
  className,
  label = 'Add to calendar',
}: AddToCalendarButtonProps) {
  const createMut = useCreatePersonalEvent();
  const [added, setAdded] = useState(() =>
    wasDeadlineAddedLocally(deadline.kind, deadline.id)
  );

  const handleClick = useCallback(async () => {
    if (added || createMut.isPending) return;

    const due = deadline.due;
    const endsAt = deadline.allDay
      ? due
      : new Date(due.getTime() + 30 * 60_000);

    try {
      await createMut.mutateAsync({
        title: deadlineTitleForCalendar(deadline),
        notes: buildDeadlineCalendarNotes(deadline),
        startsAt: due.toISOString(),
        endsAt: endsAt.toISOString(),
        allDay: deadline.allDay ?? false,
        color: deadline.courseCode ? courseColor(deadline.courseCode) : undefined,
      });
      markDeadlineAddedLocally(deadline.kind, deadline.id);
      setAdded(true);
      toast.success('Added to your calendar', {
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = '/dashboard/calendar';
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add to calendar');
    }
  }, [added, deadline, createMut]);

  if (added) {
    return (
      <Link
        href='/dashboard/calendar'
        className={cn(
          'inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline',
          className
        )}
      >
        <Check className='size-3 shrink-0' />
        On your calendar
      </Link>
    );
  }

  return (
    <button
      type='button'
      onClick={() => void handleClick()}
      disabled={createMut.isPending}
      className={cn(
        'inline-flex items-center gap-1 outline-none hover:underline focus-visible:underline disabled:opacity-60',
        className
      )}
    >
      {createMut.isPending ? (
        <Loader2 className='size-3 shrink-0 animate-spin' />
      ) : (
        <CalendarPlus className='size-3 shrink-0' />
      )}
      {label}
    </button>
  );
}
