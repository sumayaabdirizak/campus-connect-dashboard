'use client';

import { useState, type RefObject } from 'react';
import { CloudUpload, FileText, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize } from './student-assignment-card/helpers';

export function AssignmentAttachmentsField({
  files,
  fileInputRef,
  onPickFiles,
  onAddFiles,
  onRemoveFile
}: {
  files: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className='space-y-3'>
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
          onAddFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <input
          ref={fileInputRef}
          type='file'
          multiple
          onChange={onPickFiles}
          className='absolute inset-0 z-10 cursor-pointer opacity-0'
        />
        <span className='mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <CloudUpload className='size-5' aria-hidden />
        </span>
        <p className='text-sm text-foreground'>Click to upload or drag and drop</p>
        <p className='mt-0.5 text-xs text-muted-foreground'>
          Up to 10 files, 25 MB each
        </p>
      </div>
      {files.length > 0 ? (
        <ul className='space-y-2'>
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className='flex items-center gap-3 rounded-xl border border-primary/25 bg-info-muted px-4 py-3'
            >
              <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                <FileText className='size-5' aria-hidden />
              </span>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium text-foreground'>{file.name}</p>
                <p className='text-xs text-primary/70'>{formatFileSize(file.size)}</p>
              </div>
              <button
                type='button'
                onClick={() => onRemoveFile(index)}
                className='relative z-20 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
                aria-label={`Remove ${file.name}`}
              >
                <XIcon className='size-3.5' />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
