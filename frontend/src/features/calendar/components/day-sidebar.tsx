'use client';

import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddToCalendarButton } from '@/components/add-to-calendar-button';
import { calendarItemToDeadlineInput } from '../deadline-calendar';
import type { CalendarItem } from '../types';
import { KIND_LABEL } from '../types';
import { fmtTime, itemColor, itemLabel } from '../lib';

export function DaySidebar({
  selectedDay,
  selectedItems,
  isLoading,
  onOpenItem,
  onNewEvent
}: {
  selectedDay: Date;
  selectedItems: CalendarItem[];
  isLoading: boolean;
  onOpenItem: (item: CalendarItem) => void;
  onNewEvent: (day: Date) => void;
}) {
  return (
    <aside className='hidden w-[280px] shrink-0 flex-col border-r md:flex'>
      <div className='border-b px-5 py-4'>
        <p className='text-sm font-semibold text-foreground'>{format(selectedDay, 'EEEE')}</p>
        <p className='text-xs text-muted-foreground'>{format(selectedDay, 'd MMMM yyyy')}</p>
      </div>
      <div className='min-h-0 flex-1 space-y-2 overflow-auto p-4'>
        {isLoading ? (
          <p className='text-xs text-muted-foreground'>Loading…</p>
        ) : selectedItems.length === 0 ? (
          <p className='rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
            Nothing on this day.
          </p>
        ) : (
          selectedItems.map((it) => {
            const deadline = calendarItemToDeadlineInput(it);
            return (
              <div
                key={`${it.kind}-${it.id}`}
                className='space-y-2 rounded-lg border p-3'
                style={{ borderLeftColor: itemColor(it), borderLeftWidth: 3 }}
              >
                <button
                  type='button'
                  onClick={() => onOpenItem(it)}
                  className='block w-full text-left transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                >
                  <p className='text-sm font-medium text-foreground'>{itemLabel(it)}</p>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {fmtTime(it.startsAt, it.allDay)}
                  </p>
                  <p className='mt-1 text-[11px] uppercase tracking-wide text-muted-foreground'>
                    {KIND_LABEL[it.kind]}
                  </p>
                </button>
                {deadline ? (
                  <AddToCalendarButton
                    deadline={deadline}
                    className='text-xs text-muted-foreground'
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <div className='border-t p-3'>
        <Button
          variant='outline'
          size='sm'
          className='w-full gap-1.5'
          onClick={() => onNewEvent(selectedDay)}
        >
          <Plus className='size-3.5' aria-hidden />
          New event
        </Button>
      </div>
    </aside>
  );
}
