'use client';

import { Bookmark, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

export interface FacultyReportFilterState {
  period: string;
  departmentId: string;
  courseId: string;
  instructorId: string;
  studentLevel: string;
  status: string;
}

export const defaultFacultyReportFilters: FacultyReportFilterState = {
  period: '6m',
  departmentId: 'all',
  courseId: 'all',
  instructorId: 'all',
  studentLevel: 'all',
  status: 'all',
};

interface FacultyReportsFiltersProps {
  filters: FacultyReportFilterState;
  onChange: (next: FacultyReportFilterState) => void;
  departments: { id: number; name: string; code: string }[];
  sticky?: boolean;
  className?: string;
}

export function FacultyReportsFilters({
  filters,
  onChange,
  departments,
  sticky,
  className,
}: FacultyReportsFiltersProps) {
  const set = (patch: Partial<FacultyReportFilterState>) =>
    onChange({ ...filters, ...patch });

  const handleReset = () => onChange(defaultFacultyReportFilters);

  const handleSaveTemplate = () => {
    try {
      localStorage.setItem('faculty-reports-filters:v1', JSON.stringify(filters));
      showToast('success', 'Filter template saved');
    } catch {
      showToast('error', 'Could not save filter template');
    }
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80',
        sticky && 'sticky top-0 z-20',
        className
      )}
    >
      <div className='mb-2 flex items-center gap-2 text-sm font-medium'>
        <SlidersHorizontal className='text-muted-foreground size-4' />
        Global filters
      </div>
      <div className='grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4'>
        <Select value={filters.period} onValueChange={(v) => set({ period: v })}>
          <SelectTrigger className='h-9 text-xs'>
            <SelectValue placeholder='Period' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='3m'>Last 3 months</SelectItem>
            <SelectItem value='6m'>Last 6 months</SelectItem>
            <SelectItem value='12m'>Last 12 months</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.departmentId} onValueChange={(v) => set({ departmentId: v })}>
          <SelectTrigger className='h-9 text-xs'>
            <SelectValue placeholder='Department' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.studentLevel} onValueChange={(v) => set({ studentLevel: v })}>
          <SelectTrigger className='h-9 text-xs'>
            <SelectValue placeholder='Student level' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All levels</SelectItem>
            <SelectItem value='UNDERGRADUATE'>Undergraduate</SelectItem>
            <SelectItem value='POSTGRADUATE'>Postgraduate</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => set({ status: v })}>
          <SelectTrigger className='h-9 text-xs'>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            <SelectItem value='Good Standing'>Good Standing</SelectItem>
            <SelectItem value='At Risk'>At Risk</SelectItem>
            <SelectItem value='Probation'>Probation</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='mt-2 flex flex-wrap gap-2'>
        <Button size='sm' className='h-8'>
          Apply filters
        </Button>
        <Button size='sm' variant='outline' className='h-8' onClick={handleReset}>
          <RotateCcw className='mr-1 size-3.5' />
          Reset
        </Button>
        <Button size='sm' variant='ghost' className='h-8' onClick={handleSaveTemplate}>
          <Bookmark className='mr-1 size-3.5' />
          Save template
        </Button>
      </div>
    </div>
  );
}
