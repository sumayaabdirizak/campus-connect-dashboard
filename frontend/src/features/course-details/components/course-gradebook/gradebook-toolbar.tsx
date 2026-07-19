'use client';

import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Gradebook } from '../../api/gradebook-types';
import { exportGradebookCsv } from './export-csv';
import type { GradeFilter } from './gradebook-math';

interface GradebookToolbarProps {
  data: Gradebook;
  search: string;
  setSearch: (v: string) => void;
  filter: GradeFilter;
  setFilter: (v: GradeFilter) => void;
  needsGradingCount: number;
}

export function GradebookToolbar({
  data,
  search,
  setSearch,
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
      <div className='relative min-w-[160px] flex-1 max-w-xs'>
        <Search
          className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground'
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search students…'
          className='h-8 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0'
          aria-label='Search students'
        />
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
