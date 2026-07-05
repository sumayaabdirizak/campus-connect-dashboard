'use client';

import { Filter } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { CalendarKind } from '../types';
import { KIND_LABEL, ALL_KINDS } from '../types';

export interface CourseLegend {
  code: string;
  color: string;
}

export function FiltersPopover({
  kinds,
  onToggleKind,
  courses,
  hiddenCourses,
  onToggleCourse
}: {
  kinds: Record<CalendarKind, boolean>;
  onToggleKind: (kind: CalendarKind) => void;
  courses: CourseLegend[];
  hiddenCourses: Set<string>;
  onToggleCourse: (code: string) => void;
}) {
  const activeCount =
    ALL_KINDS.filter((k) => !kinds[k]).length + hiddenCourses.size;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='h-8 gap-1.5'>
          <Filter className='size-3.5' aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className='bg-primary text-primary-foreground ml-0.5 rounded-full px-1.5 text-[10px] font-semibold'>
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-64'>
        <div className='space-y-3'>
          <div>
            <p className='text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide'>
              Types
            </p>
            <div className='space-y-1.5'>
              {ALL_KINDS.map((k) => (
                <label
                  key={k}
                  className='flex cursor-pointer items-center gap-2 text-sm'
                >
                  <Checkbox checked={kinds[k]} onCheckedChange={() => onToggleKind(k)} />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </div>

          {courses.length > 0 && (
            <div className='border-t pt-3'>
              <p className='text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide'>
                Courses
              </p>
              <div className='max-h-48 space-y-1.5 overflow-auto'>
                {courses.map((c) => (
                  <label
                    key={c.code}
                    className='flex cursor-pointer items-center gap-2 text-sm'
                  >
                    <Checkbox
                      checked={!hiddenCourses.has(c.code)}
                      onCheckedChange={() => onToggleCourse(c.code)}
                    />
                    <span
                      className='size-3 shrink-0 rounded-full'
                      style={{ backgroundColor: c.color }}
                    />
                    <span className='truncate'>{c.code}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
