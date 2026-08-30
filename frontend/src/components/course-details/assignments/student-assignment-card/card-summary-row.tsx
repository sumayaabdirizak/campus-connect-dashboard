'use client';

import { Button } from '@/components/ui/button';
import { CalendarDays, Paperclip, Timer } from 'lucide-react';
import type { AssignmentDisplayStatus } from './assignment-card-state';
import { AssignmentStatusPill } from './assignment-status-pill';

export function CardSummaryRow({
  title,
  description,
  dueShort,
  dueLine,
  maxMarks,
  attachmentCount,
  status,
  expanded,
  onToggle,
}: {
  title: string;
  description?: string | null;
  dueShort: string;
  dueLine: string;
  maxMarks: number;
  attachmentCount: number;
  status: AssignmentDisplayStatus;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
          <span className='inline-flex items-center gap-1'>
            <CalendarDays className='size-3.5 text-primary' aria-hidden />
            {dueShort}
          </span>
          <span className='inline-flex items-center gap-1'>
            <Timer className='size-3.5 text-warning' aria-hidden />
            {maxMarks} pts
          </span>
          {attachmentCount > 0 ? (
            <span className='inline-flex items-center gap-1'>
              <Paperclip className='size-3.5 text-info' aria-hidden />
              {attachmentCount}
            </span>
          ) : null}
        </div>
        <AssignmentStatusPill label={status.label} tone={status.tone} />
      </div>
      <h3 className='mt-3 line-clamp-2 text-lg tracking-tight text-foreground font-display'>
        {title}
      </h3>
      {description ? (
        <p className='mt-2 text-sm text-foreground'>{description}</p>
      ) : null}
      <p className='mt-1 text-right text-sm text-foreground'>{dueLine}</p>
      <Button
        type='button'
        size='sm'
        className='mt-3 rounded-full'
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {expanded ? 'Show less' : 'Read more'}
      </Button>
    </div>
  );
}
