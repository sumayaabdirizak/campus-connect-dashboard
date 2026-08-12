'use client';

import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { StatusFilter } from './helpers';

export function AttemptsToolbar({
  statusFilter,
  onStatusFilterChange,
  counts,
  search,
  onSearchChange,
  onExport,
}: {
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  counts: {
    all: number;
    submitted: number;
    in_progress: number;
    not_started: number;
  };
  search: string;
  onSearchChange: (v: string) => void;
  onExport: () => void;
}) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <SegmentedControl
        ariaLabel='Filter attempts by status'
        value={statusFilter}
        onChange={onStatusFilterChange}
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'submitted', label: 'Submitted', count: counts.submitted },
          { value: 'in_progress', label: 'In progress', count: counts.in_progress },
          { value: 'not_started', label: 'Not started', count: counts.not_started },
        ]}
      />
      <div className='relative flex-1 min-w-[200px] max-w-xs'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
        <Input
          placeholder='Search student…'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-10 h-8'
        />
      </div>
      <Button variant='outline' size='sm' className='gap-1 ml-auto' onClick={onExport}>
        <Download className='w-4 h-4' /> Export CSV
      </Button>
    </div>
  );
}
