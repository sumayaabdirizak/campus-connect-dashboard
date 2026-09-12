'use client';

import { useRef, useState } from 'react';
import { CloudUpload, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { QuizPaperFile } from '@/lib/course-details/services/quizzes-types';
import { quizPaperFileUrl } from '@/lib/course-details/services/quizzes-service';
import {
  QUIZ_PAPER_EXTENSIONS,
  validateDocumentName
} from '@/lib/course-details/validate-document-name';
import { formatFileSize } from '../../assignments/student-assignment-card/helpers';

const ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function QuizPaperFileField({
  pendingFile,
  onPendingFile,
  existingFile,
  onRemoveExisting,
  removing,
  label = 'Quiz document'
}: {
  pendingFile: File | null;
  onPendingFile: (file: File | null) => void;
  existingFile?: QuizPaperFile | null;
  onRemoveExisting?: () => void;
  removing?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const displayFile = pendingFile ?? null;
  const showExisting = !displayFile && existingFile;

  const pick = (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    const nameCheck = validateDocumentName(file.name, {
      allowedExtensions: QUIZ_PAPER_EXTENSIONS
    });
    if (!nameCheck.ok) {
      toast.error(`"${file.name}" — ${nameCheck.message}`);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the 25 MB limit`);
      return;
    }
    onPendingFile(file);
  };

  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium text-foreground'>{label}</p>
      {showExisting ? (
        <div className='flex items-center gap-3 rounded-xl border border-primary/25 bg-info-muted px-4 py-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <FileText className='size-5' aria-hidden />
          </span>
          <div className='min-w-0 flex-1'>
            <a
              href={quizPaperFileUrl(existingFile!.url)}
              target='_blank'
              rel='noopener noreferrer'
              className='truncate text-sm font-medium text-foreground hover:underline'
            >
              {existingFile!.name}
            </a>
            {existingFile!.size != null ? (
              <p className='text-xs text-muted-foreground'>
                {formatFileSize(existingFile!.size)}
              </p>
            ) : null}
          </div>
          {onRemoveExisting ? (
            <button
              type='button'
              onClick={onRemoveExisting}
              disabled={removing}
              className='flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-destructive'
              aria-label='Remove file'
            >
              {removing ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <X className='size-3.5' />
              )}
            </button>
          ) : null}
        </div>
      ) : displayFile ? (
        <div className='flex items-center gap-3 rounded-xl border border-primary/25 bg-info-muted px-4 py-3'>
          <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <FileText className='size-5' aria-hidden />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-medium text-foreground'>{displayFile.name}</p>
            <p className='text-xs text-primary/70'>{formatFileSize(displayFile.size)}</p>
          </div>
          <button
            type='button'
            onClick={() => onPendingFile(null)}
            className='flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-muted-foreground hover:text-destructive'
            aria-label='Remove file'
          >
            <X className='size-3.5' />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors',
            dragging ? 'border-primary/50 bg-muted' : 'border-border bg-muted/50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type='file'
            accept={ACCEPT}
            onChange={(e) => {
              pick(e.target.files ?? []);
              e.target.value = '';
            }}
            className='absolute inset-0 z-10 cursor-pointer opacity-0'
          />
          <span className='mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <CloudUpload className='size-5' aria-hidden />
          </span>
          <p className='text-sm text-foreground'>Upload PDF or Word document</p>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            Max 25 MB · clear file name (letters/numbers, no special symbols)
          </p>
        </div>
      )}
    </div>
  );
}
