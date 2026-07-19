'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface MembersPaginationProps {
  start: number;
  end: number;
  total: number;
  safePage: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MembersPagination({
  start,
  end,
  total,
  safePage,
  pageCount,
  onPrev,
  onNext
}: MembersPaginationProps) {
  return (
    <div className='flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground'>
      <span>
        Showing {start + 1}–{Math.min(end, total)} of {total}
      </span>
      <div className='flex items-center gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-7'
          onClick={onPrev}
          disabled={safePage === 0}
        >
          <Icons.chevronLeft className='h-3.5 w-3.5' />
          Prev
        </Button>
        <span className='px-1'>
          {safePage + 1} / {pageCount}
        </span>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-7'
          onClick={onNext}
          disabled={safePage >= pageCount - 1}
        >
          Next
          <Icons.chevronRight className='h-3.5 w-3.5' />
        </Button>
      </div>
    </div>
  );
}
