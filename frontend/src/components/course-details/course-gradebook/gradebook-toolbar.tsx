'use client';

import { Download } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';
import type { Gradebook } from '@/lib/course-details/services/gradebook-types';
import { exportGradebookCsv } from './export-csv';
import type { GradeFilter } from './gradebook-math';

interface GradebookToolbarProps {
  data: Gradebook;
  filter: GradeFilter;
  setFilter: (v: GradeFilter) => void;
  needsGradingCount: number;
}

export function GradebookToolbar({
  data,
  filter,
  setFilter,
  needsGradingCount
}: GradebookToolbarProps) {
  const { studentCount } = data;
  const filters: { id: GradeFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: studentCount },
    { id: 'needs_grading', label: 'To grade', count: needsGradingCount }
  ];

  return (
    <div className='flex flex-wrap items-center gap-3 border-b border-border/60 px-3 py-2'>
      <div className='flex items-center gap-0.5'>
        {filters.map((f) => (
          <button
            key={f.id}
            type='button'
            onClick={() => setFilter(f.id)}
            className={cn(
              'border-b px-2.5 py-1.5 text-sm transition-colors',
              filter === f.id
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            {f.count > 0 ? (
              <span className='ml-1 tabular-nums text-muted-foreground'>{f.count}</span>
            ) : null}
          </button>
        ))}
      </div>
      <Button
        variant='ghost'
        size='sm'
        className='ml-auto h-8 gap-1.5 text-muted-foreground'
        onClick={() => exportGradebookCsv(data)}
      >
        <Download className='size-3.5' aria-hidden />
        Export CSV
      </Button>
    </div>
  );
}
