'use client';

import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReportListRowActions({
  label,
  onView
}: {
  label: string;
  onView: () => void;
}) {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className='h-8 gap-1 border-[#D0D5DD] px-3 text-xs font-medium dark:border-border'
      onClick={(e) => {
        e.stopPropagation();
        onView();
      }}
      aria-label={`View activity report for ${label}`}
    >
      View
      <ChevronRight className='size-3.5' aria-hidden />
    </Button>
  );
}
