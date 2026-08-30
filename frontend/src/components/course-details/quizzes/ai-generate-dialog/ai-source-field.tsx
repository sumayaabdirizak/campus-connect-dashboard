'use client';

import { useRef } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AI_SOURCE_ACCEPT,
  AI_SOURCE_MAX_CHARS,
  AI_SOURCE_MIN_CHARS
} from '../../_shared/extract-source-text';
import {
  quizFormHintClass,
  quizFormLabelClass,
  quizFormOutlineBtnClass
} from '../new-quiz-page/field-styles';

interface AiSourceFieldProps {
  sourceMaterial: string;
  setSourceMaterial: (v: string) => void;
  sourceFileName: string | null;
  setSourceFileName: (v: string | null) => void;
  isExtractingSource: boolean;
  onSourceFile: (file: File | undefined) => void;
  disabled: boolean;
}

export function AiSourceField({
  sourceMaterial,
  setSourceMaterial,
  sourceFileName,
  setSourceFileName,
  isExtractingSource,
  onSourceFile,
  disabled
}: AiSourceFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charCount = sourceMaterial.trim().length;
  const tooShort = charCount > 0 && charCount < AI_SOURCE_MIN_CHARS;

  return (
    <div className='space-y-2'>
      <div className='flex items-baseline justify-between gap-2'>
        <Label htmlFor='ai-source-file' className={quizFormLabelClass}>
          Source file *
        </Label>
        {sourceMaterial ? (
          <span className={`text-xs tabular-nums ${tooShort ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {sourceMaterial.length.toLocaleString()} / {AI_SOURCE_MAX_CHARS.toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <input
          ref={fileInputRef}
          id='ai-source-file'
          type='file'
          accept={AI_SOURCE_ACCEPT}
          disabled={disabled || isExtractingSource}
          className='hidden'
          onChange={(e) => {
            void onSourceFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Button
          type='button'
          variant='outline'
          className={`${quizFormOutlineBtnClass} gap-1.5`}
          disabled={disabled || isExtractingSource}
          onClick={() => fileInputRef.current?.click()}
        >
          {isExtractingSource ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Upload className='size-4' />
          )}
          {isExtractingSource ? 'Reading…' : 'Upload PDF / DOCX'}
        </Button>
        {sourceFileName ? (
          <span className='inline-flex items-center gap-1.5 rounded-full border border-border/90 bg-card py-1.5 pl-3 pr-1 text-sm text-foreground'>
            <FileText className='size-3.5 text-primary' />
            <span className='max-w-[14rem] truncate'>{sourceFileName}</span>
            <button
              type='button'
              className='rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-primary'
              aria-label='Clear loaded file'
              onClick={() => {
                setSourceFileName(null);
                setSourceMaterial('');
              }}
            >
              <X className='size-3.5' />
            </button>
          </span>
        ) : (
          <span className={quizFormHintClass}>Required for generation</span>
        )}
      </div>

      {tooShort ? (
        <p className='text-xs text-amber-600'>
          Add {AI_SOURCE_MIN_CHARS - charCount} more character
          {AI_SOURCE_MIN_CHARS - charCount === 1 ? '' : 's'} to continue.
        </p>
      ) : null}
    </div>
  );
}
