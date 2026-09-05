'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownWideNarrow, CalendarDays, Columns3, Upload } from 'lucide-react';
import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover';
import { Input } from '@/features/ui/components/input';
import { cn } from '@/lib/utils';

export type PosColumnOption = { id: string; label: string };
export type PosSortOption = { id: string; label: string };
export type PosDateRange = { from: string | null; to: string | null };

const pillBtn =
  'h-9 gap-1.5 rounded-full border bg-card px-2.5 text-sm font-medium shadow-none hover:bg-muted/60 sm:px-3.5';

function fmt(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatRangeLabel(range?: PosDateRange) {
  if (!range?.from && !range?.to) return 'All dates';
  if (range.from && range.to) return `${fmt(range.from)} - ${fmt(range.to)}`;
  if (range.from) return `From ${fmt(range.from)}`;
  return `Until ${fmt(range.to as string)}`;
}

/** A real, working date-range picker — two native date inputs in a popover. */
function DateRangePicker({
  value,
  onChange
}: {
  value?: PosDateRange;
  onChange: (next: PosDateRange) => void;
}) {
  const [draft, setDraft] = useState<PosDateRange>(value ?? { from: null, to: null });
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value ?? { from: null, to: null });
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className={cn(pillBtn, 'text-foreground hidden sm:inline-flex')}
        >
          <CalendarDays className='size-4 shrink-0' />
          <span className='max-w-[160px] truncate'>{formatRangeLabel(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-72 space-y-3'>
        <div className='space-y-1.5'>
          <label className='text-muted-foreground text-xs font-medium'>From</label>
          <Input
            type='date'
            value={draft.from ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || null }))}
            className='h-9'
          />
        </div>
        <div className='space-y-1.5'>
          <label className='text-muted-foreground text-xs font-medium'>To</label>
          <Input
            type='date'
            value={draft.to ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || null }))}
            className='h-9'
          />
        </div>
        <div className='flex justify-between gap-2 pt-1'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              onChange({ from: null, to: null });
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type Props = {
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
};

/** DreamsPOS Units table card header: pill search + filters. */
export function PosTableToolbar({
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
  className
}: Props) {
  const visible = new Set(visibleColumnIds ?? columns?.map((c) => c.id) ?? []);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 border-b px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4',
        className
      )}
    >
      <div className='flex min-w-0 w-full flex-1 flex-wrap items-center gap-2'>
        <div
          className={cn(
            'relative min-w-0 w-full sm:min-w-[10rem]',
            toolbarStart ? 'sm:max-w-xs sm:flex-none' : 'flex-1 sm:max-w-md'
          )}
        >
          <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className='h-9 w-full rounded-full border-muted-foreground/35 bg-muted-foreground/15 pl-9'
            disabled={!onSearchChange}
          />
        </div>

        {toolbarStart}

        {showDateRange && onDateRangeChange ? (
          <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
        ) : null}
      </div>

      <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>
        {columns && onVisibleColumnsChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' className={pillBtn}>
                <Columns3 className='size-4' />
                <span className='hidden sm:inline'>Columns</span>
                <Icons.chevronDown className='size-3.5 opacity-60' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48'>
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visible.has(col.id)}
                  onCheckedChange={(checked) => {
                    const next = new Set(visible);
                    if (checked) next.add(col.id);
                    else next.delete(col.id);
                    onVisibleColumnsChange([...next]);
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {sortOptions && onSortChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' className={pillBtn}>
                <ArrowDownWideNarrow className='size-4' />
                <span className='hidden sm:inline'>Sort by</span>
                <Icons.chevronDown className='size-3.5 opacity-60' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-48'>
              {sortOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  className={cn(sortId === opt.id && 'bg-muted')}
                  onClick={() => onSortChange(opt.id)}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {onExportPdf || onExportExcel ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' className={pillBtn}>
                <Upload className='size-4' />
                <span className='hidden sm:inline'>Export</span>
                <Icons.chevronDown className='size-3.5 opacity-60' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {onExportPdf ? (
                <DropdownMenuItem onClick={onExportPdf}>Export as PDF</DropdownMenuItem>
              ) : null}
              {onExportExcel ? (
                <DropdownMenuItem onClick={onExportExcel}>Export as Excel</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {toolbarEnd}
      </div>
    </div>
  );
}
