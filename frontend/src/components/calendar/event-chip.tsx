'use client';

import type { CalendarItem } from '@/lib/calendar/types';
import { KIND_LABEL } from '@/lib/calendar/types';
import { fmtTime, itemColor, itemLabel, itemTint } from './lib';

export function EventChip({
  item,
  onOpen
}: {
  item: CalendarItem;
  onOpen: (item: CalendarItem) => void;
}) {
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(item);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          onOpen(item);
        }
      }}
      title={`${KIND_LABEL[item.kind]}${item.courseCode ? ` · ${item.courseCode}` : ''} — ${fmtTime(item.startsAt, item.allDay)}`}
      className='block w-full cursor-pointer truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
      style={{ backgroundColor: itemTint(item, 18), color: itemColor(item) }}
    >
      {itemLabel(item)}
    </div>
  );
}
