'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText, ClipboardCheck, Megaphone, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type DeadlineKind = 'announcement' | 'assignment' | 'quiz';
export interface TimelineItem {
  kind: DeadlineKind;
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: number | null;
}

const ICON: Record<DeadlineKind, typeof FileText> = {
  assignment: FileText,
  quiz: ClipboardCheck,
  announcement: Megaphone
};
const ACTION_BY_ROLE: Record<'student' | 'teacher', Record<DeadlineKind, string>> = {
  student: { assignment: 'Add submission', quiz: 'Attempt quiz', announcement: 'View' },
  teacher: { assignment: 'View submissions', quiz: 'View results', announcement: 'View' }
};

function hrefFor(d: TimelineItem): string {
  if (d.kind === 'announcement') return '/dashboard/calendar';
  const tab = d.kind === 'quiz' ? 'quizzes' : 'assignments';
  return d.courseOfferingId ? `/dashboard/courses/${d.courseOfferingId}?tab=${tab}` : '/dashboard/calendar';
}

function dayHeading(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, d MMMM');
}

interface Group {
  heading: string;
  items: TimelineItem[];
}

function Segmented<T extends string>({
  value,
  onChange,
  options
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
      {options.map(([key, label]) => (
        <button
          key={key}
          type='button'
          onClick={() => onChange(key)}
          className={cn(
            'rounded px-2.5 py-1 font-medium transition-colors',
            value === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

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
  const action = ACTION_BY_ROLE[audience];
  const [rangeDays, setRangeDays] = useState<'7' | '30'>('30');
  const [sortBy, setSortBy] = useState<'date' | 'course'>('date');

  const groups = useMemo<Group[]>(() => {
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

    const m = new Map<string, Group>();
    for (const it of inRange) {
      const d = new Date(it.deadlineAt!);
      const key = format(d, 'yyyy-MM-dd');
      if (!m.has(key)) m.set(key, { heading: dayHeading(d), items: [] });
      m.get(key)!.items.push(it);
    }
    return Array.from(m.values());
  }, [items, rangeDays, sortBy]);

  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='flex flex-row flex-wrap items-center justify-between gap-2 border-b py-3'>
        <CardTitle className='text-base font-semibold'>Timeline</CardTitle>
        <div className='flex flex-wrap items-center gap-2'>
          <Segmented
            value={rangeDays}
            onChange={setRangeDays}
            options={[
              ['7', 'Next 7 days'],
              ['30', 'Next 30 days']
            ]}
          />
          <Segmented
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
                  {group.items.map((d) => {
                    const Icon = ICON[d.kind];
                    const when = d.deadlineAt ? new Date(d.deadlineAt) : null;
                    return (
                      <li key={`${d.kind}-${d.id}`} className='flex items-center gap-3 px-4 py-3'>
                        <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                          <Icon className='size-4' />
                        </span>
                        <div className='min-w-0 flex-1'>
                          <p className='text-xs text-muted-foreground'>
                            {when ? format(when, 'h:mm a') : ''}
                          </p>
                          <Link
                            href={hrefFor(d)}
                            className='block truncate text-sm font-medium text-primary hover:underline'
                          >
                            {d.title}
                          </Link>
                          <p className='truncate text-xs text-muted-foreground'>{d.courseCode ?? ''}</p>
                        </div>
                        <Button asChild variant='outline' size='sm' className='shrink-0'>
                          <Link href={hrefFor(d)}>{action[d.kind]}</Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
