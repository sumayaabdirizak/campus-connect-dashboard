'use client';

import { X } from 'lucide-react';
import type { FeedI18n } from './feed-i18n';
import { FEED_TOOLBAR_SELECT_CLASS } from './feed-toolbar-select';
import type { DateFilter, ReadFilter, SortMode } from './types';

interface FeedFiltersBarProps {
  i18n: FeedI18n;
  readFilter: ReadFilter;
  setReadFilter: (v: ReadFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
  activeFilterCount: number;
  onClearAll: () => void;
}

export function FeedFiltersBar({
  i18n,
  readFilter,
  setReadFilter,
  dateFilter,
  setDateFilter,
  sortMode,
  setSortMode,
  activeFilterCount,
  onClearAll
}: FeedFiltersBarProps) {
  return (
    <div className='inline-flex shrink-0 items-center gap-1.5'>
      <select
        value={readFilter}
        onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
        className={FEED_TOOLBAR_SELECT_CLASS}
        aria-label={i18n.readState}
      >
        <option value='ALL'>
          {i18n.readState}: {i18n.all}
        </option>
        <option value='UNREAD'>
          {i18n.readState}: {i18n.unread}
        </option>
        <option value='READ'>
          {i18n.readState}: {i18n.read}
        </option>
      </select>
      <select
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value as DateFilter)}
        className={FEED_TOOLBAR_SELECT_CLASS}
        aria-label={i18n.date}
      >
        <option value='ALL'>
          {i18n.date}: {i18n.all}
        </option>
        <option value='7D'>
          {i18n.date}: {i18n.last7d}
        </option>
        <option value='30D'>
          {i18n.date}: {i18n.last30d}
        </option>
      </select>
      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value as SortMode)}
        className={FEED_TOOLBAR_SELECT_CLASS}
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
          className='inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-dashed border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <X className='h-3 w-3' aria-hidden />
          {i18n.filtersActive(activeFilterCount)} · {i18n.clearAll}
        </button>
      ) : null}
    </div>
  );
}
