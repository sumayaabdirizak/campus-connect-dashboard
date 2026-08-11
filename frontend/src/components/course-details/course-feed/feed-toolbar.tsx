'use client';

import { Search } from 'lucide-react';
import { Input } from '@/features/ui/components/input';
import { SegmentedControl } from '@/features/ui/components/segmented-control';
import type { FeedFilter } from './types';

interface FeedToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  filter: FeedFilter;
  onFilter: (v: FeedFilter) => void;
  counts: Record<FeedFilter, number>;
}

export function FeedToolbar({
  search,
  onSearch,
  filter,
  onFilter,
  counts
}: FeedToolbarProps) {
  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='relative max-w-md flex-1'>
        <Search
          className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
          aria-hidden
        />
        <Input
          placeholder='Search posts…'
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className='h-9 pl-8'
          aria-label='Search posts'
        />
      </div>
      <SegmentedControl
        value={filter}
        onChange={onFilter}
        ariaLabel='Filter posts'
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'important', label: 'Important', count: counts.important },
          { value: 'attachments', label: 'Files', count: counts.attachments },
          { value: 'auto', label: 'Updates', count: counts.auto }
        ]}
        className='shrink-0'
      />
    </div>
  );
}
