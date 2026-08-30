'use client';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CalendarKind, CalendarView } from '@/lib/calendar/types';
import {
  FiltersPopover,
  type CourseLegend
} from './filters-popover';
import { VIEWS } from './calendar-constants';

interface CalendarToolbarProps {
  label: string;
  view: CalendarView;
  onView: (v: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  exporting: boolean;
  onExportCsv: () => void;
  onExportIcs: () => void;
  kinds: Record<CalendarKind, boolean>;
  onToggleKind: (k: CalendarKind) => void;
  courses: CourseLegend[];
  hiddenCourses: Set<string>;
  onToggleCourse: (code: string) => void;
}

export function CalendarToolbar({
  label,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  onNew,
  exporting,
  onExportCsv,
  onExportIcs,
  kinds,
  onToggleKind,
  courses,
  hiddenCourses,
  onToggleCourse
}: CalendarToolbarProps) {
  return (
    <div className='flex flex-wrap items-center gap-2 border-b px-4 py-3'>
      <div className='flex items-center gap-1'>
        <Button
          variant='ghost'
          size='icon'
          className='size-8'
          aria-label='Previous'
          onClick={onPrev}
          disabled={view === 'agenda'}
        >
          <ChevronLeft className='size-4' />
        </Button>
        <Button variant='outline' size='sm' className='h-8' onClick={onToday}>
          Today
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='size-8'
          aria-label='Next'
          onClick={onNext}
          disabled={view === 'agenda'}
        >
          <ChevronRight className='size-4' />
        </Button>
      </div>
      <h2 className='ml-1 text-base font-semibold text-foreground'>{label}</h2>
      <div className='flex-1' />
      <div className='flex rounded-md border bg-muted/40 p-0.5 text-xs'>
        {VIEWS.map(([key, lbl]) => (
          <button
            key={key}
            type='button'
            onClick={() => onView(key)}
            className={cn(
              'rounded px-2.5 py-1 font-medium transition-colors',
              view === key
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {lbl}
          </button>
        ))}
      </div>
      <FiltersPopover
        kinds={kinds}
        onToggleKind={onToggleKind}
        courses={courses}
        hiddenCourses={hiddenCourses}
        onToggleCourse={onToggleCourse}
      />
      <Button size='sm' className='h-8 gap-1.5' onClick={onNew}>
        <Plus className='size-3.5' aria-hidden />
        New
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='secondary' size='sm' className='h-8 gap-1.5' disabled={exporting}>
            <Download className='size-3.5' aria-hidden />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={onExportCsv}>
            <TableIcon className='mr-2 size-4' aria-hidden />
            Deadline table (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportIcs}>
            <CalendarDays className='mr-2 size-4' aria-hidden />
            Calendar file (.ics)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
