'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, CheckCircle2, CalendarClock, BookOpen, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { courseColor, courseTint } from '@/features/student-courses/lib/course-color';
import { cn } from '@/lib/utils';

interface NextDeadline {
  kind: 'announcement' | 'assignment' | 'quiz';
  id: number;
  title: string;
  deadlineAt: string | null;
  courseCode?: string | null;
  courseOfferingId?: number | null;
}

function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Live-ish countdown in ms to the target, re-evaluated each minute. */
function useCountdown(target: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const t = new Date(target).getTime();
  return Number.isFinite(t) ? t - now : null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Overdue';
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `Due in ${days}d ${hours}h`;
  if (hours > 0) return `Due in ${hours}h ${m}m`;
  return `Due in ${m}m`;
}

function Pill({
  icon: Icon,
  value,
  label,
  accent
}: {
  icon: typeof Clock;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className='flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-sm'>
      <Icon className={cn('size-4', accent ? 'text-primary' : 'text-muted-foreground')} />
      <span className='text-sm font-bold tabular-nums text-foreground'>{value}</span>
      <span className='text-xs text-muted-foreground'>{label}</span>
    </div>
  );
}

/**
 * "Up Next" focus hero for the student dashboard. Surfaces the single most
 * imminent deadline with a live countdown + Open CTA, accented in that course's
 * identity color, plus a row of honest at-a-glance pills. Token-driven (themes
 * + dark mode); replaces the old welcome banner.
 */
export function DashboardHero({
  userName,
  nextDeadline,
  dueSoonCount,
  coursesCount,
  updatesCount,
  loading
}: {
  userName?: string;
  nextDeadline: NextDeadline | null;
  dueSoonCount: number;
  coursesCount: number;
  updatesCount: number;
  loading?: boolean;
}) {
  const ms = useCountdown(nextDeadline?.deadlineAt ?? null);
  const color = nextDeadline?.courseCode ? courseColor(nextDeadline.courseCode) : undefined;
  const tint = nextDeadline?.courseCode ? courseTint(nextDeadline.courseCode, 10) : undefined;
  const overdue = ms != null && ms <= 0;
  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className='space-y-4'>
      <div>
        <h2 className='text-2xl font-bold tracking-tight text-foreground'>
          {greeting()}, {firstName}.
        </h2>
        <p className='text-sm text-muted-foreground'>Here's what needs your attention.</p>
      </div>

      {/* Up Next card */}
      {loading ? (
        <Skeleton className='h-24 w-full rounded-2xl' />
      ) : nextDeadline ? (
        <div
          className='relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm'
          style={tint ? { backgroundImage: `linear-gradient(to right, ${tint}, transparent 60%)` } : undefined}
        >
          <span
            className='absolute inset-y-0 left-0 w-1.5'
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <div className='flex flex-col gap-4 pl-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='text-[11px] font-bold uppercase tracking-widest text-muted-foreground'>
                  Up Next
                </span>
                {nextDeadline.courseCode && (
                  <span
                    className='rounded-md px-1.5 py-0.5 text-[11px] font-bold'
                    style={{ backgroundColor: tint, color }}
                  >
                    {nextDeadline.courseCode}
                  </span>
                )}
                <span className='rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground'>
                  {nextDeadline.kind === 'quiz' ? 'Quiz' : 'Assignment'}
                </span>
              </div>
              <h3 className='mt-1.5 truncate text-lg font-bold text-foreground'>
                {nextDeadline.title}
              </h3>
              <p
                className={cn(
                  'mt-0.5 flex items-center gap-1.5 text-sm font-medium',
                  overdue ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                <Clock className='size-3.5' />
                {ms != null ? formatCountdown(ms) : 'No due time'}
              </p>
            </div>
            {nextDeadline.courseOfferingId && (
              <Button asChild className='shrink-0 gap-1.5'>
                <Link
                  href={`/dashboard/courses/${nextDeadline.courseOfferingId}?tab=${
                    nextDeadline.kind === 'quiz' ? 'quizzes' : 'assignments'
                  }`}
                >
                  Open
                  <ArrowRight className='size-4' />
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className='flex items-center gap-3 rounded-2xl border border-dashed bg-card p-5 shadow-sm'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-success-muted text-success'>
            <CheckCircle2 className='size-5' />
          </span>
          <div>
            <p className='text-sm font-bold text-foreground'>You're all caught up</p>
            <p className='text-xs text-muted-foreground'>
              No assignments or quizzes due in the next 30 days.
            </p>
          </div>
        </div>
      )}

      {/* At-a-glance pills */}
      <div className='flex flex-wrap gap-2'>
        <Pill icon={CalendarClock} value={dueSoonCount} label='due this week' accent={dueSoonCount > 0} />
        <Pill icon={BookOpen} value={coursesCount} label='courses' />
        <Pill icon={Bell} value={updatesCount} label='updates' />
      </div>
    </div>
  );
}
