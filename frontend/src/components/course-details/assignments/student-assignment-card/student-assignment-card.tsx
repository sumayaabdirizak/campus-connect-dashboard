'use client';

import { format } from 'date-fns';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { useCourseLiveNow } from '@/components/course-details/course-live-clock';
import { cn } from '@/lib/utils';
import {
  getAssignmentDisplayStatus,
  resolveAssignmentCardTiming
} from './assignment-card-state';
import {
  AssignmentCardBody,
  AssignmentCardFooter,
  AssignmentCardHeader
} from './card-summary-row';

export function StudentAssignmentCard({
  assignment: a,
  onOpen
}: {
  assignment: Assignment;
  onOpen: () => void;
}) {
  useCourseLiveNow();

  const listSub = a.submissions?.[0];
  const timing = resolveAssignmentCardTiming(a, null, null, a._extension ?? null);
  const status = getAssignmentDisplayStatus(timing, {
    grade: listSub?.grade ?? null,
    isLate: listSub?.is_late ?? false,
    maxMarks: a.maxMarks ?? 100
  });

  const dueShort = format(timing.due, 'MMM d');
  const dueLine = timing.hasExtension
    ? `Extended to ${format(timing.due, 'MMM d, h:mm a')}`
    : `Due ${format(timing.due, 'MMM d, h:mm a')}`;

  return (
    <article
      role='button'
      tabIndex={0}
      aria-label={`Open assignment ${a.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'flex h-full min-h-[15.5rem] min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-foreground outline-none transition-colors',
        'hover:border-border hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className='shrink-0 border-b border-border/60 bg-card px-5 pt-5 pb-3'>
        <AssignmentCardHeader
          dueShort={dueShort}
          maxMarks={a.maxMarks ?? 100}
          attachmentCount={a.attachments?.length ?? 0}
          status={status}
        />
      </div>

      <div className='min-h-0 flex-1 px-5 py-3'>
        <AssignmentCardBody title={a.title} description={a.description} />
      </div>

      <div className='shrink-0 border-t border-border/60 bg-card px-5 pt-3 pb-5'>
        <AssignmentCardFooter dueLine={dueLine} onOpen={onOpen} />
      </div>
    </article>
  );
}
