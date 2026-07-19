'use client';

import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  userRole?: string;
  currentFilter: FeedTab;
  setCurrentFilter: (tab: FeedTab) => void;
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
  activeFilterCount: number;
  onClearAll: () => void;
}

export function FeedHeader({
  i18n,
  canCreate,
  canManage,
  draftCount,
  onOpenCreate,
  userRole,
  currentFilter,
  setCurrentFilter,
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
  activeFilterCount,
  onClearAll
}: FeedHeaderProps) {
  return (
    <header className='shrink-0 border-b border-border/60 bg-background/95 px-4 backdrop-blur-2xl'>
      {canCreate ? (
        <div className='flex items-center justify-between gap-2 py-3'>
          <h1 className='text-base font-semibold tracking-tight'>{i18n.feedLabel}</h1>
          <Button
            type='button'
            onClick={onOpenCreate}
            className='relative h-9 rounded-full px-4 text-sm shadow-sm'
            aria-label={i18n.createWithDraftsAria(draftCount)}
          >
            <Plus className='me-1 h-4 w-4' aria-hidden />
            {i18n.create}
            {draftCount > 0 ? (
              <Badge
                className='absolute -end-1.5 -top-1.5 min-h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums'
                variant='default'
                aria-hidden
              >
                {draftCount > 99 ? '99+' : draftCount}
              </Badge>
            ) : null}
          </Button>
        </div>
      ) : null}
      <FeedTabs
        i18n={i18n}
        currentFilter={currentFilter}
        setCurrentFilter={setCurrentFilter}
        canManage={canManage}
      />
      <FeedFiltersBar
        i18n={i18n}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        readFilter={readFilter}
        setReadFilter={setReadFilter}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        sortMode={sortMode}
        setSortMode={setSortMode}
        canManage={canManage}
        userRole={userRole}
        activeFilterCount={activeFilterCount}
        onClearAll={onClearAll}
      />
    </header>
  );
}
