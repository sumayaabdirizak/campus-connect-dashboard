'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { AssignmentListFilter } from './use-teacher-assignment-list';

interface ListStats {
  total: number;
  published: number;
  drafts: number;
  overdue: number;
  pendingGrading: number;
}

interface AssignmentListFiltersProps {
  filter: AssignmentListFilter;
  onFilterChange: (v: AssignmentListFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  stats: ListStats;
}

export function AssignmentListFilters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
  stats
}: AssignmentListFiltersProps) {
  const listFilterOptions = [
    { value: 'all' as const, label: 'All', count: stats.total },
    { value: 'live' as const, label: 'Live', count: stats.published },
    { value: 'draft' as const, label: 'Drafts', count: stats.drafts },
    { value: 'grading' as const, label: 'To grade', count: stats.pendingGrading },
    { value: 'overdue' as const, label: 'Overdue', count: stats.overdue }
  ];

  return (
    <div className='grid gap-3 lg:grid-cols-[1fr_360px] lg:items-center'>
      <div className='overflow-x-auto rounded-2xl border bg-muted/20 p-2'>
        <SegmentedControl
          value={filter}
          onChange={onFilterChange}
          options={listFilterOptions}
          ariaLabel='Filter assignments'
          width='auto'
        />
      </div>
      <div className='relative w-full'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search title, instructions, attachments'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className='h-10 rounded-2xl pl-10'
        />
      </div>
    </div>
  );
}
