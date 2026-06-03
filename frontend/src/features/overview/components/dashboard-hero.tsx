'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowRight, CheckCircle2, CalendarClock, BookOpen, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

function GlassPill({ icon: Icon, value, label }: { icon: typeof Clock; value: number; label: string }) {
  return (
    <div className='flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 backdrop-blur'>
      <Icon className='size-4 text-primary-foreground/80' />
      <span className='text-sm font-bold tabular-nums'>{value}</span>
      <span className='text-xs text-primary-foreground/70'>{label}</span>
    </div>
  );
}

/**
 * "Up Next" focus hero — a vivid gradient focal anchor (theme `primary`, so it
 * adapts to every theme + dark mode). Surfaces the most imminent deadline with a
 * live countdown + Open CTA, plus honest at-a-glance pills.
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
  const overdue = ms != null && ms <= 0;
  const firstName = userName?.split(' ')[0] || 'there';

  return (
    <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/75 p-6 text-primary-foreground shadow-lg sm:p-7'>
      {/* soft light glow for depth */}
      <div
        className='pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-primary-foreground/10 blur-3xl'
        aria-hidden
      />
      <div className='relative'>
        <h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
          {greeting()}, {firstName}.
        </h2>
        <p className='mt-1 text-sm text-primary-foreground/80'>Here's what needs your attention.</p>

        {/* Up Next */}
        <div className='mt-5'>
          {loading ? (
            <Skeleton className='h-24 w-full rounded-2xl bg-primary-foreground/15' />
          ) : nextDeadline ? (
            <div className='flex flex-col gap-4 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-[11px] font-bold uppercase tracking-widest text-primary-foreground/70'>
                    Up Next
                  </span>
                  {nextDeadline.courseCode && (
                    <span className='rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-[11px] font-bold'>
                      {nextDeadline.courseCode}
                    </span>
                  )}
                  <span className='rounded-md bg-primary-foreground/15 px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground/80'>
                    {nextDeadline.kind === 'quiz' ? 'Quiz' : 'Assignment'}
                  </span>
                </div>
                <h3 className='mt-1.5 truncate text-lg font-bold'>{nextDeadline.title}</h3>
                <span
                  className={cnUrgency(overdue)}
                >
                  <Clock className='size-3.5' />
                  {ms != null ? formatCountdown(ms) : 'No due time'}
                </span>
              </div>
              {nextDeadline.courseOfferingId && (
                <Button
                  asChild
                  className='shrink-0 gap-1.5 bg-background text-foreground hover:bg-background/90'
                >
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
          ) : (
            <div className='flex items-center gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20'>
                <CheckCircle2 className='size-5' />
              </span>
              <div>
                <p className='text-sm font-bold'>You're all caught up</p>
                <p className='text-xs text-primary-foreground/75'>
                  No assignments or quizzes due in the next 30 days.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* At-a-glance pills */}
        <div className='mt-4 flex flex-wrap gap-2'>
          <GlassPill icon={CalendarClock} value={dueSoonCount} label='due this week' />
          <GlassPill icon={BookOpen} value={coursesCount} label='courses' />
          <GlassPill icon={Bell} value={updatesCount} label='updates' />
        </div>
      </div>
    </div>
  );
}

/** Countdown chip styling — light on the gradient, with an urgent tint when overdue. */
function cnUrgency(overdue: boolean): string {
  return [
    'mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold',
    overdue
      ? 'bg-destructive text-destructive-foreground'
      : 'bg-primary-foreground/15 text-primary-foreground'
  ].join(' ');
}
