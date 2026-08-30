'use client';

import { Plus, Search } from 'lucide-react';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import type { FeedI18n } from './feed-i18n';
import { FeedFiltersBar } from './feed-filters-bar';
import { FeedTabs } from './feed-tabs';
import type { DateFilter, FeedTab, ReadFilter, SortMode } from './types';

interface FeedHeaderProps {
  i18n: FeedI18n;
  canCreate: boolean;
  canManage: boolean;
  draftCount: number;
  onOpenCreate: () => void;
  currentFilter: FeedTab;
  setCurrentFilter: (tab: FeedTab) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  readFilter: ReadFilter;
  setReadFilter: (v: ReadFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  sortMode: SortMode;
  setSortMode: (v: SortMode) => void;
  activeFilterCount: number;
  onClearAll: () => void;
}

export function FeedHeader({
  i18n,
  canCreate,
  canManage,
  draftCount,
  onOpenCreate,
  currentFilter,
  setCurrentFilter,
  searchQuery,
  setSearchQuery,
  readFilter,
  setReadFilter,
  dateFilter,
  setDateFilter,
  sortMode,
  setSortMode,
  activeFilterCount,
  onClearAll
}: FeedHeaderProps) {
  return (
    <header className='shrink-0 border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm'>
      <div className='flex items-center gap-2 py-2'>
        <div
          className='flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        >
          {canCreate ? (
            <Button
              type='button'
              onClick={onOpenCreate}
              size='sm'
              className='relative h-7 shrink-0 rounded-full px-2.5 text-[11px] font-medium'
              aria-label={i18n.createWithDraftsAria(draftCount)}
            >
              <Plus className='me-1 h-3 w-3' aria-hidden />
              {i18n.create}
              {draftCount > 0 ? (
                <Badge
                  className='absolute -end-1.5 -top-1.5 min-h-4 min-w-4 justify-center rounded-full px-1 py-0 text-[9px] font-semibold tabular-nums'
                  variant='default'
                  aria-hidden
                >
                  {draftCount > 99 ? '99+' : draftCount}
                </Badge>
              ) : null}
            </Button>
          ) : null}
          <FeedTabs
            i18n={i18n}
            currentFilter={currentFilter}
            setCurrentFilter={setCurrentFilter}
            canManage={canManage}
          />
          <FeedFiltersBar
            i18n={i18n}
            readFilter={readFilter}
            setReadFilter={setReadFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            sortMode={sortMode}
            setSortMode={setSortMode}
            activeFilterCount={activeFilterCount}
            onClearAll={onClearAll}
          />
        </div>
        <div className='relative w-[10rem] shrink-0 sm:w-[12rem] md:w-[14rem]'>
          <Search
            aria-hidden
            className='pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='h-7 border-border bg-muted/30 ps-8 text-xs transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-ring/40'
            placeholder={i18n.search}
            aria-label={i18n.search}
          />
        </div>
      </div>
    </header>
  );
}
