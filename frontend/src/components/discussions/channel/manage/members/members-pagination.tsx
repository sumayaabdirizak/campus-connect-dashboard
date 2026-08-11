'use client'

import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'

interface MembersPaginationProps {
  start: number
  end: number
  total: number
  safePage: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
}

export function MembersPagination({
  start,
  end,
  total,
  safePage,
  pageCount,
  onPrev,
  onNext,
}: MembersPaginationProps) {
  return (
    <div className='flex items-center justify-between gap-2 pt-1 text-xs text-[#667085]'>
      <span className='tabular-nums'>
        {start + 1}–{Math.min(end, total)} of {total}
      </span>
      <div className='flex items-center gap-1'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 rounded-lg border-[#E5E7EB] px-2.5 text-[#101828]'
          onClick={onPrev}
          disabled={safePage === 0}
        >
          <Icons.chevronLeft className='size-3.5' />
        </Button>
        <span className='min-w-10 text-center tabular-nums'>
          {safePage + 1}/{pageCount}
        </span>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 rounded-lg border-[#E5E7EB] px-2.5 text-[#101828]'
          onClick={onNext}
          disabled={safePage >= pageCount - 1}
        >
          <Icons.chevronRight className='size-3.5' />
        </Button>
      </div>
    </div>
  )
}
