'use client';

import Link from 'next/link';
import { FileText, ClipboardCheck, Megaphone, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

const ACTION: Record<DeadlineKind, string> = {
  assignment: 'Add submission',
  quiz: 'Attempt quiz',
  announcement: 'View'
};

function dueLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = format(d, 'h:mm a');
  if (isToday(d)) return `Today, ${time}`;
  if (isTomorrow(d)) return `Tomorrow, ${time}`;
  return `${format(d, 'EEE, d MMM')}, ${time}`;
}

function hrefFor(d: TimelineItem): string {
  if (d.kind === 'announcement') return '/dashboard/calendar';
  const tab = d.kind === 'quiz' ? 'quizzes' : 'assignments';
  return d.courseOfferingId ? `/dashboard/courses/${d.courseOfferingId}?tab=${tab}` : '/dashboard/calendar';
}

/**
 * Moodle-style Timeline block — the chronological list of activities that
 * require action, with activity-type icon, due date, course, and an action
 * button per item.
 */
export function TimelineBlock({
  items,
  loading
}: {
  items: TimelineItem[];
  loading?: boolean;
}) {
  return (
    <Card className='rounded-lg border-border'>
      <CardHeader className='border-b py-3'>
        <CardTitle className='text-base font-semibold'>Timeline</CardTitle>
      </CardHeader>
      <CardContent className='p-0'>
        {loading ? (
          <div className='space-y-3 p-4'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-12 w-full' />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-2 px-4 py-10 text-center'>
            <CheckCircle2 className='size-8 text-muted-foreground/50' />
            <p className='text-sm text-muted-foreground'>No activities require action.</p>
          </div>
        ) : (
          <ul className='divide-y divide-border'>
            {items.map((d) => {
              const Icon = ICON[d.kind];
              return (
                <li key={`${d.kind}-${d.id}`} className='flex items-center gap-3 px-4 py-3'>
                  <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <Icon className='size-4' />
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='text-xs text-muted-foreground'>{dueLabel(d.deadlineAt)}</p>
                    <Link
                      href={hrefFor(d)}
                      className='block truncate text-sm font-medium text-primary hover:underline'
                    >
                      {d.title}
                    </Link>
                    <p className='truncate text-xs text-muted-foreground'>{d.courseCode ?? ''}</p>
                  </div>
                  <Button asChild variant='outline' size='sm' className='shrink-0'>
                    <Link href={hrefFor(d)}>{ACTION[d.kind]}</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
