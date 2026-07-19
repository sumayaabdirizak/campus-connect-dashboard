'use client';

import { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ChipGroup } from './chip-group';
import type { FeedI18n } from './feed-i18n';
import type { DateFilter, ReadFilter, SortMode } from './types';

interface FeedFiltersBarProps {
  i18n: FeedI18n;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  readFilter: ReadFilter;
  setReadFilter: (v: ReadFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
  canManage: boolean;
  userRole?: string;
  activeFilterCount: number;
  onClearAll: () => void;
}

export function FeedFiltersBar({
  i18n,
  searchQuery,
  setSearchQuery,
  readFilter,
  setReadFilter,
  dateFilter,
  setDateFilter,
  roleFilter,
  setRoleFilter,
  sortMode,
  setSortMode,
  canManage,
  userRole,
  activeFilterCount,
  onClearAll
}: FeedFiltersBarProps) {
  const roleFilterOptions = useMemo(() => {
    const merged = [
      ...(userRole ? [String(userRole).toUpperCase()] : []),
      'STUDENT',
      'TEACHER',
      'DEAN',
      'SUPER_ADMIN'
    ];
    return Array.from(new Set(merged));
  }, [userRole]);

  return (
    <div className='space-y-2 py-3'>
      <div className='relative'>
        <Search
          aria-hidden
          className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500'
        />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='h-10 border-neutral-200/80 bg-neutral-50/80 ps-10 text-sm transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-neutral-400 focus-visible:border-neutral-300 focus-visible:ring-neutral-200/60 dark:border-neutral-800 dark:bg-neutral-900/50 dark:focus-visible:border-neutral-600 dark:focus-visible:ring-neutral-700/40'
          placeholder={i18n.search}
          aria-label={i18n.search}
        />
      </div>
      <div className='-mx-1 flex max-w-full flex-wrap items-center gap-2 overflow-x-auto px-1 pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        <ChipGroup
          label={i18n.readState}
          value={readFilter}
          onChange={(v) => setReadFilter(v as ReadFilter)}
          options={[
            { value: 'ALL', label: i18n.all },
            { value: 'UNREAD', label: i18n.unread },
            { value: 'READ', label: i18n.read }
          ]}
        />
        <ChipGroup
          label={i18n.date}
          value={dateFilter}
          onChange={(v) => setDateFilter(v as DateFilter)}
          options={[
            { value: 'ALL', label: i18n.all },
            { value: '7D', label: i18n.last7d },
            { value: '30D', label: i18n.last30d }
          ]}
        />
        {canManage ? (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className='h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            aria-label={i18n.role}
          >
            <option value='ALL'>
              {i18n.role}: {i18n.all}
            </option>
            {roleFilterOptions.map((r) => (
              <option key={r} value={r}>
                {r === 'TEACHER' ? 'LECTURER' : r}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className='h-8 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          aria-label={i18n.sort}
        >
          <option value='NEWEST'>
            {i18n.sort}: {i18n.newest}
          </option>
          <option value='OLDEST'>
            {i18n.sort}: {i18n.oldest}
          </option>
          <option value='PRIORITY'>
            {i18n.sort}: {i18n.priority}
          </option>
        </select>
        {activeFilterCount > 0 ? (
          <button
            type='button'
            onClick={onClearAll}
            className='inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <X className='h-3 w-3' aria-hidden />
            {i18n.filtersActive(activeFilterCount)} · {i18n.clearAll}
          </button>
        ) : null}
      </div>
    </div>
  );
}
