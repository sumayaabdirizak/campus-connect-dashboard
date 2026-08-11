'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { cn } from '@/lib/utils';
import { posTableColors as c } from './pos-colors';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
};

function pageWindow(current: number, totalPages: number, max = 5) {
  if (totalPages <= max) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(max / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(totalPages, start + max - 1);
  start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Same colors as PosTable: blue active page, gray borders/text. */
export function PosTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'items',
  className
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pages = pageWindow(safePage, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col items-stretch gap-3 border-t px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4',
        className
      )}
      style={{ borderColor: c.border, backgroundColor: c.headerBg }}
    >
      <p className='text-center text-sm sm:text-left' style={{ color: c.text }}>
        Showing {from}-{to} of {total} {itemLabel}
      </p>

      <div className='flex flex-wrap items-center justify-center gap-1.5 sm:gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='Previous page'
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className='size-8 rounded-full bg-white shadow-none disabled:opacity-40 sm:size-9'
          style={{ borderColor: c.border, color: c.text }}
        >
          <ChevronLeft className='size-4' />
        </Button>

        {pages.map((p) => {
          const active = p === safePage;
          return (
            <Button
              key={p}
              type='button'
              size='icon'
              variant={active ? 'default' : 'outline'}
              aria-label={`Page ${p}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={cn(
                'size-8 rounded-full shadow-none sm:size-9',
                active
                  ? 'border-0 text-white hover:opacity-90'
                  : 'bg-white hover:bg-[#F9FAFB]'
              )}
              style={
                active
                  ? { backgroundColor: c.primary, color: c.white }
                  : { borderColor: c.border, color: c.text }
              }
            >
              {p}
            </Button>
          );
        })}

        <Button
          type='button'
          variant='outline'
          size='icon'
          aria-label='Next page'
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className='size-8 rounded-full bg-white shadow-none disabled:opacity-40 sm:size-9'
          style={{ borderColor: c.border, color: c.text }}
        >
          <ChevronRight className='size-4' />
        </Button>
      </div>

      <div className='flex items-center justify-center gap-2 sm:justify-end'>
        <span className='text-sm whitespace-nowrap' style={{ color: c.text }}>
          <span className='sm:hidden'>Rows</span>
          <span className='hidden sm:inline'>Go to Page</span>
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            onPageSizeChange(Number(value));
            onPageChange(1);
          }}
        >
          <SelectTrigger
            className='h-9 w-[4.5rem] rounded-lg bg-white shadow-none'
            style={{ borderColor: c.border, color: c.heading }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align='end'>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
