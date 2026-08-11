'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card';
import { Skeleton } from '@/features/ui/components/skeleton';
import { SegmentedControl } from './timeline-block/segmented-control';
import { TimelineItemRow } from './timeline-block/timeline-item-row';
import {
  timelineDayHeading,
  type TimelineGroup,
  type TimelineItem
} from './timeline-block/types';

export type { TimelineItem } from './timeline-block/types';

/**
 * Moodle-style Timeline block with the real controls: a date-range filter
 * (next 7 / 30 days), sort by date or by course, and day-grouped headings
 * (Today / Tomorrow / weekday). Each row: activity icon, due time, name,
 * course, and an action button.
 */
export function TimelineBlock({
  items,
  loading,
  audience = 'student'
}: {
  items: TimelineItem[];
  loading?: boolean;
  audience?: 'student' | 'teacher';
}) {
  const [rangeDays, setRangeDays] = useState<'7' | '30'>('30');
  const [sortBy, setSortBy] = useState<'date' | 'course'>('date');

  const groups = useMemo<TimelineGroup[]>(() => {
    const end = Date.now() + Number(rangeDays) * 24 * 60 * 60 * 1000;
    const inRange = items
      .filter((d) => d.deadlineAt && new Date(d.deadlineAt).getTime() <= end)
      .sort((a, b) => new Date(a.deadlineAt!).getTime() - new Date(b.deadlineAt!).getTime());

    if (sortBy === 'course') {
      const m = new Map<string, TimelineItem[]>();
      for (const it of inRange) {
        const k = it.courseCode || 'Other';
        (m.get(k) ?? m.set(k, []).get(k)!).push(it);
      }
      return Array.from(m, ([heading, groupItems]) => ({ heading, items: groupItems }));
    }

    const m = new Map<string, TimelineGroup>();
    for (const it of inRange) {
      const d = new Date(it.deadlineAt!);
      const key = format(d, 'yyyy-MM-dd');
      if (!m.has(key)) m.set(key, { heading: timelineDayHeading(d), items: [] });
      m.get(key)!.items.push(it);
    }
    return Array.from(m.values());
  }, [items, rangeDays, sortBy]);

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2 border-b py-3'>
        <CardTitle className='text-base font-semibold'>Timeline</CardTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <SegmentedControl
            value={rangeDays}
            onChange={setRangeDays}
            options={[
              ['7', 'Next 7 days'],
              ['30', 'Next 30 days']
            ]}
          />
          <SegmentedControl
            value={sortBy}
            onChange={setSortBy}
            options={[
              ['date', 'By date'],
              ['course', 'By course']
            ]}
          />
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        {loading ? (
          <div className='space-y-3 p-4'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-12 w-full' />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 px-4 py-10 text-center'>
            <CheckCircle2 className='size-8 text-muted-foreground/50' />
            <p className='text-sm text-muted-foreground'>
              No activities require action in the next {rangeDays} days.
            </p>
          </div>
        ) : (
          <div className='divide-y divide-border'>
            {groups.map((group) => (
              <div key={group.heading}>
                <p className='bg-muted/40 px-4 py-1.5 text-xs font-semibold text-muted-foreground'>
                  {group.heading}
                </p>
                <ul className='divide-y divide-border'>
                  {group.items.map((d) => (
                    <TimelineItemRow key={`${d.kind}-${d.id}`} item={d} audience={audience} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
