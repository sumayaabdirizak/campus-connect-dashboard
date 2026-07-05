'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, X } from 'lucide-react';
import { parseQuestionCsv } from './question-csv';

interface QuestionCsvImportPanelProps {
  mode: 'bank' | 'quiz';
  text: string;
  onTextChange: (text: string) => void;
  /** Hide paste area and column docs — file upload only. */
  uploadOnly?: boolean;
  /** Quiz import appends rows — show the amber callout when true. */
  showAdditiveWarning?: boolean;
  disabled?: boolean;
}

const BANK_COLUMNS =
  'question_text, type, points, topic, difficulty, option_1, option_1_correct, option_2, option_2_correct, …';

const QUIZ_COLUMNS =
  'question_text, type, points, topic, difficulty, explanation, option_1, option_1_correct, … option_6, option_6_correct';

export function QuestionCsvImportPanel({
  mode,
  text,
  onTextChange,
  uploadOnly = false,
  showAdditiveWarning = false,
  disabled = false
}: QuestionCsvImportPanelProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuestionCsv(text, mode), [text, mode]);
  const validCount = parsed.rows.length;
  const errorCount = parsed.errors.length;

  useEffect(() => {
    if (!text.trim()) setFileName(null);
  }, [text]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const t = await file.text();
    onTextChange(t);
    setFileName(file.name);
  };

  const clearFile = () => {
    setFileName(null);
    onTextChange('');
  };

  const validationSummary =
    text.trim() !== '' ? (
      <div className='flex flex-wrap items-center gap-2 text-xs'>
        <Badge variant={validCount > 0 ? 'default' : 'destructive'}>
          {validCount} valid
        </Badge>
        {errorCount > 0 ? (
          <Badge variant='destructive'>{errorCount} skipped</Badge>
        ) : null}
        {errorCount > 0 && parsed.errors[0] ? (
          <span className='text-muted-foreground line-clamp-2'>
            Row {parsed.errors[0].rowIndex + 2}: {parsed.errors[0].reason}
          </span>
        ) : null}
      </div>
    ) : null;

  const fileInput = (
    <div className='space-y-2'>
      <Label htmlFor={`csv-file-${mode}`}>Upload a file</Label>
      <Input
        id={`csv-file-${mode}`}
        type='file'
        accept='.csv,text/csv'
        disabled={disabled}
        className='w-full cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium'
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {fileName ? (
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary' className='gap-1 text-xs font-normal'>
            <FileText className='h-3 w-3' />
            {fileName}
            <button
              type='button'
              className='ml-0.5 rounded-sm hover:bg-muted'
              aria-label='Remove file'
              onClick={clearFile}
            >
              <X className='h-3 w-3' />
            </button>
          </Badge>
        </div>
      ) : null}
      {validationSummary}
    </div>
  );

  if (uploadOnly) {
    return fileInput;
  }

  return (
    <div className='space-y-4'>
      {showAdditiveWarning ? (
        <div className='rounded-lg border border-amber-300/40 bg-amber-50 p-3 text-xs space-y-1 dark:bg-amber-950/30'>
          <p className='font-medium text-amber-900 dark:text-amber-200'>Heads up — import is additive</p>
          <p className='text-amber-800 dark:text-amber-300'>
            Uploaded questions are <strong>appended</strong> to the quiz. Existing questions stay put.
            To replace them, delete first in the builder, then re-import.
          </p>
        </div>
      ) : null}

      <div className='rounded-lg border bg-muted/30 p-4 space-y-2'>
        <p className='text-sm text-muted-foreground'>
          Paste rows or upload a <code className='rounded bg-background px-1 py-0.5 text-[11px]'>.csv</code>{' '}
          file. Header row required — column order does not matter.
        </p>
        <code className='block overflow-x-auto whitespace-nowrap rounded border bg-background px-2 py-1.5 text-[11px]'>
          {mode === 'quiz' ? QUIZ_COLUMNS : BANK_COLUMNS}
        </code>
        <p className='text-[11px] text-muted-foreground'>
          <code className='rounded bg-background px-1 py-0.5'>type</code> is one of{' '}
          <code className='rounded bg-background px-1 py-0.5'>MCQ</code>,{' '}
          <code className='rounded bg-background px-1 py-0.5'>TRUE_FALSE</code>, or{' '}
          <code className='rounded bg-background px-1 py-0.5'>SHORT_ANSWER</code>. Up to 6 options.
          {mode === 'bank' ? ' Explanation columns are ignored for bank imports.' : null}
        </p>
      </div>

      {fileInput}

      <div className='space-y-1.5'>
        <Label htmlFor={`csv-paste-${mode}`}>…or paste rows</Label>
        <Textarea
          id={`csv-paste-${mode}`}
          rows={10}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
          placeholder={
            mode === 'quiz'
              ? 'Paste CSV rows (including the header row). Easiest path: download from the Export tab, edit in Excel, paste back.'
              : 'Paste CSV rows here (including the header row). Use New question for one-offs, or export from a quiz and trim columns.'
          }
          className='select-text font-mono text-xs'
        />
      </div>

      {validationSummary}
    </div>
  );
}

export function useQuestionCsvParse(text: string, mode: 'bank' | 'quiz') {
  return useMemo(() => parseQuestionCsv(text, mode), [text, mode]);
}
