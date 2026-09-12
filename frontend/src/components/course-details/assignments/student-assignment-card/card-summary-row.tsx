'use client';

import { Button } from '@/components/ui/button';
import { CalendarDays, Paperclip, Timer } from 'lucide-react';
import type { AssignmentDisplayStatus } from './assignment-card-state';
import { AssignmentStatusPill } from './assignment-status-pill';

export function AssignmentCardHeader({
  dueShort,
  maxMarks,
  attachmentCount,
  status
}: {
  dueShort: string;
  maxMarks: number;
  attachmentCount: number;
  status: AssignmentDisplayStatus;
}) {
  return (
    <header className='flex shrink-0 items-start justify-between gap-3'>
      <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground'>
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
    </header>
  );
}

export function AssignmentCardBody({
  title,
  description
}: {
  title: string;
  description?: string | null;
}) {
  return (
    <div className='flex h-full min-w-0 flex-col'>
      <h3 className='line-clamp-2 min-h-[3.5rem] text-lg leading-7 tracking-tight text-foreground font-display'>
        {title}
      </h3>
      <p className='mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-foreground'>
        {description?.trim() ? description : '\u00A0'}
      </p>
    </div>
  );
}

export function AssignmentCardFooter({
  dueLine,
  onOpen
}: {
  dueLine: string;
  onOpen: () => void;
}) {
  return (
    <footer className='flex shrink-0 items-center justify-between gap-3'>
      <Button
        type='button'
        size='sm'
        className='rounded-full'
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        View details
      </Button>
      <p className='min-w-0 truncate text-right text-sm text-muted-foreground'>
        {dueLine}
      </p>
    </footer>
  );
}

/** @deprecated Prefer AssignmentCardHeader / Body / Footer */
export function CardSummaryRow({
  title,
  description,
  dueShort,
  dueLine,
  maxMarks,
  attachmentCount,
  status,
  onOpen
}: {
  title: string;
  description?: string | null;
  dueShort: string;
  dueLine: string;
  maxMarks: number;
  attachmentCount: number;
  status: AssignmentDisplayStatus;
  onOpen: () => void;
}) {
  return (
    <>
      <AssignmentCardHeader
        dueShort={dueShort}
        maxMarks={maxMarks}
        attachmentCount={attachmentCount}
        status={status}
      />
      <div className='mt-3'>
        <AssignmentCardBody title={title} description={description} />
      </div>
      <div className='mt-3'>
        <AssignmentCardFooter dueLine={dueLine} onOpen={onOpen} />
      </div>
    </>
  );
}
