'use client';

import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { navigateToCourseOffering } from '@/lib/course-offering-href';
import type { DeadlineRow } from './types';
import { WEEKDAYS } from './types';

function kindTitle(kind: DeadlineRow['kind']): string {
  switch (kind) {
    case 'quiz':
      return 'Quiz';
    case 'assignment':
      return 'Assignment';
    default:
      return 'Announcement';
  }
}

function chipLabel(d: DeadlineRow): string {
  const kind = kindTitle(d.kind);
  const name = d.courseCode ? `${d.courseCode} - ${d.title}` : d.title;
  return `${kind}: ${name}`;
}

function chipStyle(d: DeadlineRow): { bg: string; text: string } {
  switch (d.kind) {
    case 'quiz':
      return { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' };
    case 'assignment':
      return { bg: 'bg-[#FCE7F3]', text: 'text-[#BE185D]' };
    default:
      return { bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' };
  }
}

function openDeadline(d: DeadlineRow) {
  if (d.kind === 'announcement') {
    window.location.assign('/dashboard/calendar');
    return;
  }
  if (!d.courseOfferingId) return;
  navigateToCourseOffering(d.courseOfferingId, {
    tab: d.kind === 'quiz' ? 'quizzes' : 'assignments',
    quiz: d.kind === 'quiz' ? d.id : undefined
  });
}

interface MonthCalendarGridProps {
  days: Date[];
  viewMonth: Date;
  selected: Date;
  byDay: Map<string, DeadlineRow[]>;
  onSelectDay: (day: Date) => void;
  /** Chip month cells (dashboard) vs compact day buttons. */
  size?: 'sm' | 'lg';
}

export function MonthCalendarGrid({
  days,
  viewMonth,
  selected,
  byDay,
  onSelectDay,
  size = 'sm'
}: MonthCalendarGridProps) {
  const large = size === 'lg';

  if (!large) {
    return (
      <div className='grid grid-cols-7 gap-1 text-center'>
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className='py-1 text-[10px] font-medium uppercase text-muted-foreground'
          >
            {w}
          </span>
        ))}
        {days.map((day) => {
          const k = format(day, 'yyyy-MM-dd');
          const has = byDay.has(k);
          const inMonth = isSameMonth(day, viewMonth);
          const isSel = isSameDay(day, selected);
          const today = isToday(day);
          return (
            <button
              key={k}
              type='button'
              onClick={() => onSelectDay(day)}
              aria-pressed={isSel}
              aria-label={`${format(day, 'EEEE, d MMMM')}${has ? ', has deadlines' : ''}`}
              className={cn(
                'relative flex h-8 items-center justify-center rounded-md text-xs transition-colors',
                isSel
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : today
                    ? 'font-bold text-primary hover:bg-muted'
                    : inMonth
                      ? 'text-foreground hover:bg-muted'
                      : 'text-muted-foreground/40 hover:bg-muted'
              )}
            >
              {format(day, 'd')}
              {has ? (
                <span
                  className={cn(
                    'absolute bottom-1 size-1 rounded-full',
                    isSel ? 'bg-primary-foreground' : 'bg-primary'
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className='overflow-hidden rounded-xl border border-[#E4E7EC] bg-white dark:border-border dark:bg-card'>
      <div className='grid grid-cols-7 border-b border-[#E4E7EC] dark:border-border'>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className='px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-[#98A2B3] dark:text-muted-foreground'
          >
            {w}
          </div>
        ))}
      </div>
      <div className='grid auto-rows-fr grid-cols-7'>
        {days.map((day, index) => {
          const k = format(day, 'yyyy-MM-dd');
          const items = byDay.get(k) ?? [];
          const inMonth = isSameMonth(day, viewMonth);
          const isSel = isSameDay(day, selected);
          const today = isToday(day);
          const weekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={k}
              role='button'
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectDay(day);
              }}
              className={cn(
                'flex min-h-[108px] flex-col border-b border-r border-[#E4E7EC] p-1.5 text-left transition-colors dark:border-border',
                index % 7 === 6 && 'border-r-0',
                isSel && 'bg-primary/[0.04]',
                !inMonth && 'bg-[#F9FAFB]/40 dark:bg-muted/20',
                weekend && inMonth && 'bg-[#F8FAFC]/80 dark:bg-muted/10',
                'hover:bg-[#F2F4F7]/80 dark:hover:bg-muted/30'
              )}
            >
              <span
                className={cn(
                  'mb-1 flex size-7 items-center justify-center self-start rounded-full text-xs tabular-nums',
                  today
                    ? 'bg-primary font-semibold text-white'
                    : inMonth
                      ? 'font-medium text-[#344054] dark:text-foreground'
                      : 'text-[#D0D5DD] dark:text-muted-foreground/40'
                )}
              >
                {format(day, 'd')}
              </span>
              <div className='flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden'>
                {items.slice(0, 3).map((d) => {
                  const style = chipStyle(d);
                  return (
                    <button
                      key={`${d.kind}-${d.id}`}
                      type='button'
                      title={chipLabel(d)}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeadline(d);
                      }}
                      className={cn(
                        'w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium',
                        style.bg,
                        style.text
                      )}
                    >
                      {chipLabel(d)}
                    </button>
                  );
                })}
                {items.length > 3 ? (
                  <span className='px-1 text-[10px] font-medium text-[#667085] dark:text-muted-foreground'>
                    +{items.length - 3} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
