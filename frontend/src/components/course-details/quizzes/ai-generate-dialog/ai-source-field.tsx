'use client';

import { FileText, Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  return (
    <div className='space-y-1.5'>
      <Label htmlFor='ai-source'>
        Source material{' '}
        <span className='text-muted-foreground font-normal'>
          (optional — chapter text, lecture notes, etc.)
        </span>
      </Label>
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          id='ai-source-file'
          type='file'
          accept={AI_SOURCE_ACCEPT}
          disabled={disabled || isExtractingSource}
          className='max-w-xs text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs'
          onChange={(e) => {
            void onSourceFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {sourceFileName ? (
          <Badge variant='secondary' className='gap-1 text-[11px] font-normal'>
            <FileText className='w-3 h-3' />
            {sourceFileName}
            <button
              type='button'
              className='ml-0.5 rounded-sm hover:bg-muted'
              aria-label='Clear loaded file label'
              onClick={() => setSourceFileName(null)}
            >
              <X className='w-3 h-3' />
            </button>
          </Badge>
        ) : null}
        {isExtractingSource ? (
          <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground'>
            <Loader2 className='w-3 h-3 animate-spin' />
            Reading file…
          </span>
        ) : null}
      </div>
      <p className='text-[11px] text-muted-foreground'>
        Upload PDF, DOCX, or plain text (.txt, .md, .csv) — extracted text appears below. You
        can still paste or edit manually.
      </p>
      <Textarea
        id='ai-source'
        rows={6}
        placeholder='Paste reference material here, or upload a file above. When provided, the AI grounds every question in this content instead of guessing.'
        value={sourceMaterial}
        onChange={(e) => {
          setSourceMaterial(e.target.value.slice(0, AI_SOURCE_MAX_CHARS));
          if (!e.target.value.trim()) setSourceFileName(null);
        }}
        disabled={disabled || isExtractingSource}
        className='font-mono text-xs select-text'
      />
      <p className='text-[11px] text-muted-foreground tabular-nums'>
        {sourceMaterial.length.toLocaleString()} / {AI_SOURCE_MAX_CHARS.toLocaleString()}{' '}
        characters
      </p>
    </div>
  );
}
