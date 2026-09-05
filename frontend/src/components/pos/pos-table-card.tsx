'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  PosTableToolbar,
  type PosColumnOption,
  type PosSortOption,
  type PosDateRange
} from './pos-table-toolbar';

type Props = {
  children: ReactNode;
  footer?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showDateRange?: boolean;
  dateRange?: PosDateRange;
  onDateRangeChange?: (range: PosDateRange) => void;
  columns?: PosColumnOption[];
  visibleColumnIds?: string[];
  onVisibleColumnsChange?: (ids: string[]) => void;
  sortOptions?: PosSortOption[];
  sortId?: string;
  onSortChange?: (id: string) => void;
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  toolbarStart?: ReactNode;
  toolbarEnd?: ReactNode;
  className?: string;
  /** Classes for the scrollable region between toolbar and footer. */
  bodyClassName?: string;
};

/** DreamsPOS Units-style white card: pill toolbar + table body + pagination. */
export function PosTableCard({
  children,
  footer,
  search,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showDateRange = false,
  dateRange,
  onDateRangeChange,
  columns,
  visibleColumnIds,
  onVisibleColumnsChange,
  sortOptions,
  sortId,
  onSortChange,
  onExportPdf,
  onExportExcel,
  toolbarStart,
  toolbarEnd,
  className,
  bodyClassName
}: Props) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border bg-card',
        className
      )}
    >
      <div className='shrink-0'>
        <PosTableToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          showDateRange={showDateRange}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          columns={columns}
          visibleColumnIds={visibleColumnIds}
          onVisibleColumnsChange={onVisibleColumnsChange}
          sortOptions={sortOptions}
          sortId={sortId}
          onSortChange={onSortChange}
          onExportPdf={onExportPdf}
          onExportExcel={onExportExcel}
          toolbarStart={toolbarStart}
          toolbarEnd={toolbarEnd}
        />
      </div>
      {/* min-w-0 + overflow: keep card within viewport; scroll wide / tall tables */}
      <div
        className={cn(
          'w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]',
          bodyClassName
        )}
      >
        {children}
      </div>
      {footer ? <div className='shrink-0'>{footer}</div> : null}
    </div>
  );
}
