'use client';

import { Button } from '@/components/ui/button';
import { CalendarDays, Paperclip, Timer } from 'lucide-react';
import { CardMetaChip } from '@/components/course-details/_shared/card-meta-chip';
import type { AssignmentDisplayStatus } from './assignment-card-state';
import { AssignmentStatusPill } from './assignment-status-pill';

/** Title + status pill share a row (product-name + tag convention), then the
 *  description sits underneath — matches the reference template's product
 *  tile shape more closely than the old separate meta-only header. */
export function AssignmentCardTitleRow({
  title,
  description,
  status
}: {
  title: string;
  description?: string | null;
  status: AssignmentDisplayStatus;
}) {
  return (
    <div className='flex min-w-0 flex-col'>
      <div className='flex items-start justify-between gap-2'>
        <h3 className='line-clamp-2 min-h-[3.5rem] text-lg leading-7 tracking-tight text-foreground font-display'>
          {title}
        </h3>
        <div className='shrink-0 pt-0.5'>
          <AssignmentStatusPill label={status.label} tone={status.tone} />
        </div>
      </div>
      <p className='mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-foreground'>
        {description?.trim() ? description : ' '}
      </p>
    </div>
  );
}

export function AssignmentCardMetaRow({
  dueShort,
  maxMarks,
  attachmentCount
}: {
  dueShort: string;
  maxMarks: number;
  attachmentCount: number;
}) {
  return (
    <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
      <CardMetaChip icon={CalendarDays}>{dueShort}</CardMetaChip>
      <CardMetaChip icon={Timer}>{maxMarks} pts</CardMetaChip>
      {attachmentCount > 0 ? (
        <CardMetaChip icon={Paperclip}>{attachmentCount}</CardMetaChip>
      ) : null}
    </div>
  );
}

/** Bottom bar: bold primary info (left, like a product's price) + the
 *  action button (right) — the reference template puts its strongest,
 *  boldest text on the bottom-left of the tile next to the action area. */
export function AssignmentCardFooter({
  dueLine,
  onOpen
}: {
  dueLine: string;
  onOpen: () => void;
}) {
  return (
    <footer className='flex shrink-0 items-center justify-between gap-3'>
      <p className='min-w-0 truncate text-sm font-bold text-foreground'>{dueLine}</p>
      <Button
        type='button'
        size='sm'
        className='shrink-0 rounded-full'
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        View details
      </Button>
    </footer>
  );
}

/** @deprecated kept for any stray imports of the pre-redesign header piece. */
export function AssignmentCardHeader(props: {
  dueShort: string;
  maxMarks: number;
  attachmentCount: number;
  status: AssignmentDisplayStatus;
}) {
  return (
    <AssignmentCardMetaRow
      dueShort={props.dueShort}
      maxMarks={props.maxMarks}
      attachmentCount={props.attachmentCount}
    />
  );
}

/** @deprecated Prefer AssignmentCardTitleRow. */
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
        {description?.trim() ? description : ' '}
      </p>
    </div>
  );
}
