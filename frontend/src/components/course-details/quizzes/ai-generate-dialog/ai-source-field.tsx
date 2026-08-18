'use client';

import { useRef } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AI_SOURCE_ACCEPT,
  AI_SOURCE_MAX_CHARS
} from '../../_shared/extract-source-text';

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

  return (
    <div className='space-y-1.5'>
      <div className='flex items-baseline justify-between gap-2'>
        <Label htmlFor='ai-source'>
          Source material{' '}
          <span className='text-muted-foreground font-normal'>(optional)</span>
        </Label>
        {sourceMaterial ? (
          <span className='text-[11px] text-muted-foreground tabular-nums'>
            {sourceMaterial.length.toLocaleString()} / {AI_SOURCE_MAX_CHARS.toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className='flex items-center gap-2'>
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
          size='sm'
          className='gap-1.5'
          disabled={disabled || isExtractingSource}
          onClick={() => fileInputRef.current?.click()}
        >
          {isExtractingSource ? (
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
          ) : (
            <Upload className='w-3.5 h-3.5' />
          )}
          {isExtractingSource ? 'Reading file…' : 'Upload file'}
        </Button>
        {sourceFileName ? (
          <span className='inline-flex items-center gap-1.5 rounded-full border bg-muted/50 pl-2.5 pr-1 py-0.5 text-xs'>
            <FileText className='w-3 h-3 text-muted-foreground' />
            <span className='max-w-[14rem] truncate'>{sourceFileName}</span>
            <button
              type='button'
              className='rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground'
              aria-label='Clear loaded file label'
              onClick={() => setSourceFileName(null)}
            >
              <X className='w-3 h-3' />
            </button>
          </span>
        ) : (
          <span className='text-[11px] text-muted-foreground'>
            PDF, DOCX, or plain text — or just paste below
          </span>
        )}
      </div>

      <Textarea
        id='ai-source'
        rows={4}
        placeholder='Paste reference material here, or upload a file above. When provided, the AI grounds every question in this content instead of guessing.'
        value={sourceMaterial}
        onChange={(e) => {
          setSourceMaterial(e.target.value.slice(0, AI_SOURCE_MAX_CHARS));
          if (!e.target.value.trim()) setSourceFileName(null);
        }}
        disabled={disabled || isExtractingSource}
        className='text-xs select-text'
      />
    </div>
  );
}
