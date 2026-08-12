'use client';

import { Button } from '@/components/ui/button';
import {
  Download,
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react';

export function SubmissionsToolbar({
  selectedCount,
  onBack,
  onBulkGrade,
  onBulkExtend,
  onExport
}: {
  selectedCount: number;
  onBack: () => void;
  onBulkGrade: () => void;
  onBulkExtend: () => void;
  onExport: () => void;
}) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <Button variant='ghost' onClick={onBack} className='gap-1 pl-0 hover:bg-transparent'>
        <ArrowLeft className='w-4 h-4' /> Back to table
      </Button>
      <div className='flex flex-wrap items-center gap-2'>
        {selectedCount > 0 ? (
          <>
            <Button variant='outline' size='sm' className='gap-1.5' onClick={onBulkGrade}>
              <ClipboardCheck className='w-4 h-4' /> Grade {selectedCount}
            </Button>
            <Button variant='outline' size='sm' className='gap-1.5' onClick={onBulkExtend}>
              <CalendarClock className='w-4 h-4' /> Extend {selectedCount}
            </Button>
          </>
        ) : null}
        <Button variant='outline' size='sm' className='gap-1.5' onClick={onExport}>
          <Download className='w-4 h-4' /> Export CSV
        </Button>
      </div>
    </div>
  );
}

export function MultiTabGradingBanner() {
  return (
    <div className='rounded-2xl border border-warning/30 bg-warning-muted px-4 py-3 text-sm text-warning-foreground shadow-sm'>
      <div className='flex items-start gap-2'>
        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
        <div>
          <p className='font-medium'>This assignment is open in another tab.</p>
          <p className='text-xs'>
            Grading in both tabs at once can overwrite changes. Close one tab before
            saving.
          </p>
        </div>
      </div>
    </div>
  );
}
