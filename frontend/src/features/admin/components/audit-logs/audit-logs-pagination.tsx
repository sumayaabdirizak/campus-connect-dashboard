'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AuditLogsPaginationProps {
  selectedCount: number;
  total: number;
  showingFrom: number;
  showingTo: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageSize: (size: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function AuditLogsPagination({
  selectedCount,
  total,
  showingFrom,
  showingTo,
  page,
  pageCount,
  pageSize,
  onPageSize,
  onPrev,
  onNext,
}: AuditLogsPaginationProps) {
  return (
    <div className='flex shrink-0 flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
      <p className='text-muted-foreground text-sm'>
        {selectedCount > 0 ? `${selectedCount} selected · ` : ''}
        {total === 0
          ? 'No entries'
          : `Showing ${showingFrom}–${showingTo} of ${total.toLocaleString()}`}
      </p>
      <div className='flex items-center gap-2'>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSize(Number(v))}
        >
          <SelectTrigger size='sm' className='w-[110px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[15, 25, 50].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-8'
          disabled={page <= 1}
          onClick={onPrev}
        >
          <ChevronLeft className='size-4' />
        </Button>
        <span className='text-muted-foreground min-w-[88px] text-center text-sm'>
          Page {page} of {pageCount}
        </span>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-8'
          disabled={page >= pageCount}
          onClick={onNext}
        >
          <ChevronRight className='size-4' />
        </Button>
      </div>
    </div>
  );
}
