'use client';

import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FileText, FileUp, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQuestionCsvParse } from '../../_shared/question-csv-import-panel';
import type { DraftQuestion } from '../quiz-builder/types';

const COLUMNS =
  'question_text, type, points, option_1, option_1_correct, … option_6, option_6_correct';

/// CSV import for the single-page "Add new quiz" flow. Parsing already
/// happens entirely client-side (`useQuestionCsvParse`) — there's no quiz on
/// the server yet to import into, so this just stages the parsed rows as
/// local drafts instead of calling the real import endpoint. Purpose-built
/// (not the shared QuestionCsvImportPanel) so the copy can assume there's no
/// Export tab to fall back on here.
export function LocalCsvImportDialog({
  open,
  onOpenChange,
  onImport
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: DraftQuestion[]) => void;
}) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsed = useQuestionCsvParse(csvText, 'quiz');
  const validCount = parsed.rows.length;
  const errorCount = parsed.errors.length;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCsvText('');
      setFileName(null);
    }
    onOpenChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setCsvText(await file.text());
    setFileName(file.name);
  };

  const handleImport = () => {
    if (validCount === 0) {
      toast.error('Nothing to import — check the CSV format');
      return;
    }
    const questions: DraftQuestion[] = parsed.rows.map((r) => ({
      id: null,
      question_text: r.question_text,
      question_type: r.question_type,
      points: r.points,
      correct_answer: null,
      explanation: r.explanation ?? '',
      options: r.question_type === 'SHORT_ANSWER' ? [] : r.options
    }));
    onImport(questions);
    toast.success(`Added ${questions.length} question${questions.length === 1 ? '' : 's'}`);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md gap-4 p-6'>
        <DialogHeader className='space-y-1.5 text-left'>
          <DialogTitle className='flex items-center gap-2'>
            <FileUp className='w-4 h-4 text-primary' />
            Import from CSV
          </DialogTitle>
          <DialogDescription>Upload or paste rows to stage questions.</DialogDescription>
        </DialogHeader>

        <div className='flex items-center gap-2'>
          <input
            ref={fileInputRef}
            type='file'
            accept='.csv,text/csv'
            className='hidden'
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className='w-3.5 h-3.5' /> Upload file
          </Button>
          {fileName ? (
            <span className='inline-flex items-center gap-1.5 rounded-full border bg-muted/50 pl-2.5 pr-1 py-0.5 text-xs'>
              <FileText className='w-3 h-3 text-muted-foreground' />
              <span className='max-w-[12rem] truncate'>{fileName}</span>
              <button
                type='button'
                className='rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground'
                aria-label='Clear loaded file'
                onClick={() => {
                  setFileName(null);
                  setCsvText('');
                }}
              >
                <X className='w-3 h-3' />
              </button>
            </span>
          ) : (
            <span className='text-[11px] text-muted-foreground'>.csv — or paste below</span>
          )}
        </div>

        <Textarea
          rows={6}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder='Paste CSV rows here, including the header row.'
          className='text-xs font-mono select-text'
        />

        <details className='text-[11px] text-muted-foreground'>
          <summary className='cursor-pointer select-none hover:text-foreground'>
            Column format
          </summary>
          <code className='mt-1.5 block overflow-x-auto whitespace-nowrap rounded border bg-muted/40 px-2 py-1.5'>
            {COLUMNS}
          </code>
          <p className='mt-1'>type is MCQ, TRUE_FALSE, or SHORT_ANSWER.</p>
        </details>

        {csvText.trim() ? (
          <div className='flex flex-wrap items-center gap-2 text-xs'>
            <Badge variant={validCount > 0 ? 'success' : 'destructive'} size='xs' className='rounded-full'>
              {validCount} valid
            </Badge>
            {errorCount > 0 ? (
              <Badge variant='destructive' size='xs' className='rounded-full'>
                {errorCount} skipped
              </Badge>
            ) : null}
            {errorCount > 0 && parsed.errors[0] ? (
              <span className='text-muted-foreground line-clamp-1'>
                Row {parsed.errors[0].rowIndex + 2}: {parsed.errors[0].reason}
              </span>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={validCount === 0} className='gap-1.5'>
            <Upload className='h-4 w-4' />
            {validCount > 0 ? `Import ${validCount} question${validCount === 1 ? '' : 's'}` : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
