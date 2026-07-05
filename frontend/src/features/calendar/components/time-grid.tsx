'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarItem } from '../types';
import { itemColor, itemLabel, fmtTime, minutesSinceMidnight } from '../lib';

const HOUR_HEIGHT = 48; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Placed {
  item: CalendarItem;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

/** Greedy lane layout: cluster overlapping events, then pack each cluster into
 *  the fewest side-by-side lanes so concurrent events split the column width. */
function layoutDay(items: CalendarItem[]): Placed[] {
  const timed = items
    .filter((i) => !i.allDay && i.startsAt)
    .map((i) => {
      const startMin = minutesSinceMidnight(i.startsAt);
      const endMin = i.endsAt
        ? Math.max(minutesSinceMidnight(i.endsAt), startMin + 30)
        : startMin + 30;
      return { item: i, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const placed: Placed[] = [];
  let cluster: typeof timed = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf = new Map<(typeof cluster)[number], number>();
    for (const ev of cluster) {
      let lane = laneEnds.findIndex((end) => end <= ev.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(ev.endMin);
      } else {
        laneEnds[lane] = ev.endMin;
      }
      laneOf.set(ev, lane);
    }
    const lanes = laneEnds.length;
    for (const ev of cluster) {
      placed.push({ ...ev, lane: laneOf.get(ev) ?? 0, lanes });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of timed) {
    if (cluster.length > 0 && ev.startMin >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  flush();
  return placed;
}

function NowLine() {
  const [min, setMin] = useState(
    () => new Date().getHours() * 60 + new Date().getMinutes()
  );
  useEffect(() => {
    const id = window.setInterval(() => {
      const n = new Date();
      setMin(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      className='pointer-events-none absolute inset-x-0 z-20'
      style={{ top: (min / 60) * HOUR_HEIGHT }}
    >
      <div className='relative'>
        <span className='absolute -left-1 -top-1 size-2 rounded-full bg-red-500' />
        <div className='border-t border-red-500' />
      </div>
    </div>
  );
}

export function TimeGrid({
  days,
  items,
  onOpen,
  onSlotClick
}: {
  days: Date[];
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
  /** Click an empty area of a day to start a new event on that date. */
  onSlotClick?: (date: Date) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Land the scroll near the working day on first paint.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const perDay = useMemo(
    () =>
      days.map((day) => {
        const dayItems = items.filter(
          (i) => i.startsAt && isSameDay(new Date(i.startsAt), day)
        );
        return {
          day,
          allDay: dayItems.filter((i) => i.allDay),
          placed: layoutDay(dayItems)
        };
      }),
    [days, items]
  );

  const hasAllDay = perDay.some((d) => d.allDay.length > 0);

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      {/* Day headers */}
      <div
        className='grid border-b'
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className='border-l px-2 py-1.5 text-center'>
            <div className='text-muted-foreground text-[11px] uppercase'>
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'mx-auto mt-0.5 flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                isToday(day) ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* All-day strip */}
      {hasAllDay && (
        <div
          className='grid border-b bg-muted/20'
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <div className='text-muted-foreground px-1 py-1 text-right text-[10px]'>
            all-day
          </div>
          {perDay.map(({ day, allDay }) => (
            <div key={day.toISOString()} className='space-y-0.5 border-l p-1'>
              {allDay.map((it) => {
                const color = itemColor(it);
                return (
                  <button
                    key={`${it.kind}-${it.id}`}
                    type='button'
                    onClick={() => onOpen(it)}
                    title={itemLabel(it)}
                    className='block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium'
                    style={{
                      backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                      color
                    }}
                  >
                    {itemLabel(it)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable hour grid */}
      <div ref={scrollRef} className='min-h-0 flex-1 overflow-auto'>
        <div
          className='grid'
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          {/* Hour gutter */}
          <div className='relative' style={{ height: 24 * HOUR_HEIGHT }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className='text-muted-foreground absolute right-1 -translate-y-1/2 text-[10px] tabular-nums'
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h === 0 ? '' : format(new Date(2000, 0, 1, h), 'h a')}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {perDay.map(({ day, placed }) => (
            <div
              key={day.toISOString()}
              className='relative border-l'
              style={{ height: 24 * HOUR_HEIGHT }}
              onClick={(e) => {
                if (e.target === e.currentTarget) onSlotClick?.(day);
              }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className='pointer-events-none absolute inset-x-0 border-b border-border/50'
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}

              {isToday(day) && <NowLine />}

              {placed.map(({ item, startMin, endMin, lane, lanes }) => {
                const color = itemColor(item);
                const top = (startMin / 60) * HOUR_HEIGHT;
                const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 18);
                const widthPct = 100 / lanes;
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type='button'
                    onClick={() => onOpen(item)}
                    title={`${itemLabel(item)} — ${fmtTime(item.startsAt, false)}`}
                    className='absolute z-10 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    style={{
                      top,
                      height,
                      left: `calc(${lane * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      backgroundColor: `color-mix(in oklab, ${color} 16%, var(--card))`,
                      borderLeftColor: color,
                      color
                    }}
                  >
                    <span className='block truncate font-medium'>{itemLabel(item)}</span>
                    {height > 28 && (
                      <span className='block truncate opacity-80'>
                        {fmtTime(item.startsAt, false)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
