'use client';

import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  AlertTriangle,
  FileCode2,
  X as XIcon
} from 'lucide-react';
import { attachmentDownloadUrl } from '@/lib/course-details/services/assignments-service';
import type { AssignmentAttachment } from '@/lib/course-details/services/assignments-types';
import { formatFileSize } from './student-assignment-card/helpers';

function fileKind(att: AssignmentAttachment) {
  const name = att.name.toLowerCase();
  const mime = att.mimeType ?? '';
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'PDF';
  if (mime.includes('word') || name.endsWith('.docx') || name.endsWith('.doc')) return 'Word';
  if (mime.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'Excel';
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'TypeScript';
  if (name.endsWith('.zip')) return 'ZIP';
  const ext = name.split('.').pop();
  return ext ? ext.toUpperCase() : 'File';
}

export function SubmissionsToolbar({
  title,
  attachments,
  gradeCount,
  extendCount,
  onBack,
  onBulkGrade,
  onBulkExtend,
  onDeleteAttachment
}: {
  title: string;
  attachments?: AssignmentAttachment[];
  gradeCount: number;
  extendCount: number;
  onBack: () => void;
  onBulkGrade: () => void;
  onBulkExtend: () => void;
  onDeleteAttachment: (att: { id: number; name: string }) => void;
}) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <div className='flex min-w-0 items-center gap-3'>
        <Button variant='ghost' onClick={onBack} className='gap-1 shrink-0 pl-0 hover:bg-transparent'>
          <ArrowLeft className='w-4 h-4' /> Back to table
        </Button>
        <span className='hidden h-5 w-px shrink-0 bg-border sm:block' aria-hidden />
        <h2 className='min-w-0 truncate text-lg font-semibold tracking-tight text-foreground'>
          {title}
        </h2>
      </div>
      <div className='ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2'>
        {attachments && attachments.length > 0
          ? attachments.map((att) => (
              <div
                key={att.id}
                className='flex items-center gap-2.5 rounded-xl bg-[#dbeafe] px-2 py-1.5 pr-2.5'
              >
                <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white'>
                  <FileCode2 className='size-4' aria-hidden />
                </span>
                <a
                  href={attachmentDownloadUrl(att.id)}
                  className='min-w-0 leading-tight'
                >
                  <p className='max-w-[12rem] truncate text-sm font-semibold text-[#1e40af]'>
                    {att.name}
                  </p>
                  <p className='text-[11px] text-primary'>
                    {fileKind(att)}
                    {typeof att.size === 'number' ? ` · ${formatFileSize(att.size)}` : ''}
                  </p>
                </a>
                <button
                  type='button'
                  className='ml-1 shrink-0 text-primary/70 hover:text-destructive'
                  onClick={() => onDeleteAttachment(att)}
                  aria-label='Delete attachment'
                >
                  <XIcon className='size-3.5' />
                </button>
              </div>
            ))
          : null}
        {gradeCount > 0 || extendCount > 0 ? (
          <>
            {gradeCount > 0 ? (
              <Button variant='outline' size='sm' className='gap-1.5' onClick={onBulkGrade}>
                <ClipboardCheck className='w-4 h-4' /> Grade {gradeCount}
              </Button>
            ) : null}
            {extendCount > 0 ? (
              <Button variant='outline' size='sm' className='gap-1.5' onClick={onBulkExtend}>
                <CalendarClock className='w-4 h-4' /> Extend {extendCount}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function MultiTabGradingBanner() {
  return (
    <div className='rounded-xl border border-warning/30 bg-warning-muted px-4 py-3 text-sm text-warning-foreground'>
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
