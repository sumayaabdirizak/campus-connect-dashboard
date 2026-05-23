'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Download, FileDown, FileUp, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  useExportQuizCsv,
  useImportQuizCsv
} from '../api/quizzes-queries';
import {
  downloadCsv,
  parseQuestionCsv
} from './_shared/question-csv';

interface QuizCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /// Offering scope — used by the import mutation to invalidate the right
  /// quiz list query after a successful import. The dialog itself doesn't
  /// fetch anything offering-scoped, so this is plumbing-only.
  courseOfferingId: string;
  quizId: number;
  /// Used in the dialog copy ("Round-trip <strong>{title}</strong>'s
  /// questions…"). The actual download filename is built server-side from a
  /// slug of this same title.
  quizTitle: string;
}

/**
 * Single dialog covering both directions of a quiz CSV round-trip:
 *
 *   Tab 1 — Download: server-rendered CSV via `useExportQuizCsv`, then
 *           dropped into the browser via `downloadCsv()`. One click.
 *
 *   Tab 2 — Upload:   paste rows or upload a .csv file, the shared
 *           `parseQuestionCsv` validates client-side, the dialog shows a
 *           live "N valid · M skipped (row 5: …)" count, and the user
 *           confirms before the rows POST to the server.
 *
 * Default tab is Download because the most common flow is "export → tweak
 * in Excel → re-import" — opening to the export side primes the user for
 * the round-trip rather than the cold-start "type CSV from scratch" path.
 */
export function QuizCsvDialog({
  open,
  onOpenChange,
  courseOfferingId,
  quizId,
  quizTitle
}: QuizCsvDialogProps) {
  const exportMutation = useExportQuizCsv();
  const importMutation = useImportQuizCsv(courseOfferingId);

  // Upload-side state — kept local to the dialog so closing and re-opening
  // drops the in-progress paste. Teachers rarely return to half-pasted CSV.
  const [csvText, setCsvText] = useState('');

  // Parse on every keystroke. The parser is cheap (linear scan) and the
  // result drives the live N-valid / M-skipped badges below the textarea,
  // so we want it fresh without a debounce.
  const parsed = useMemo(
    () => parseQuestionCsv(csvText, 'quiz'),
    [csvText]
  );
  const validCount = parsed.rows.length;
  const errorCount = parsed.errors.length;

  const handleDownload = () => {
    exportMutation.mutate(quizId, {
      onSuccess: (res) => {
        downloadCsv(res.filename, res.csv);
        toast.success(
          `Exported ${res.questionCount} question${res.questionCount === 1 ? '' : 's'}`
        );
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  const handleImport = () => {
    if (validCount === 0) {
      toast.error('Nothing to import — check the CSV format');
      return;
    }
    importMutation.mutate(
      {
        quizId,
        input: {
          questions: parsed.rows.map((r) => ({
            question_text: r.question_text,
            question_type: r.question_type,
            points: r.points,
            // Quiz round-trip preserves explanation (unlike bank import).
            explanation: r.explanation,
            options:
              r.question_type === 'SHORT_ANSWER' ? undefined : r.options
          }))
        }
      },
      {
        onSuccess: (res) => {
          toast.success(
            `Imported ${res.imported} question${res.imported === 1 ? '' : 's'}`
          );
          setCsvText('');
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>CSV import / export</DialogTitle>
          <DialogDescription>
            Round-trip <strong>{quizTitle}</strong>'s questions through a CSV
            file — useful for bulk-editing in Excel or sharing a template
            with co-teachers.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue='export' className='mt-2'>
          <TabsList className='grid grid-cols-2 w-full'>
            <TabsTrigger value='export' className='gap-1'>
              <FileDown className='w-3.5 h-3.5' /> Download
            </TabsTrigger>
            <TabsTrigger value='import' className='gap-1'>
              <FileUp className='w-3.5 h-3.5' /> Upload
            </TabsTrigger>
          </TabsList>

          {/* ── Download tab ─────────────────────────────────────────── */}
          <TabsContent value='export' className='mt-4 space-y-3'>
            <div className='rounded-lg border bg-muted/30 p-4 space-y-2'>
              <p className='text-sm'>
                Downloads every question on this quiz as a CSV file with the
                canonical column order:
              </p>
              <code className='block text-[11px] bg-background border rounded px-2 py-1.5 overflow-x-auto whitespace-nowrap'>
                question_text, type, points, topic, difficulty, explanation,
                option_1, option_1_correct, … option_6, option_6_correct
              </code>
              <p className='text-[11px] text-muted-foreground'>
                Opens cleanly in Excel and Google Sheets. The file includes a
                UTF-8 BOM so non-ASCII characters survive the round-trip.
              </p>
            </div>
            <Button
              onClick={handleDownload}
              disabled={exportMutation.isPending}
              className='gap-1 w-full'
            >
              <Download className='w-4 h-4' />
              {exportMutation.isPending ? 'Preparing…' : 'Download CSV'}
            </Button>
          </TabsContent>

          {/* ── Upload tab ───────────────────────────────────────────── */}
          <TabsContent value='import' className='mt-4 space-y-3'>
            <div className='rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-1'>
              <p className='font-medium text-amber-900 dark:text-amber-200'>
                Heads up — import is additive
              </p>
              <p className='text-amber-800 dark:text-amber-300'>
                Uploaded questions are <strong>appended</strong> to the end of
                the quiz. Existing questions stay put. To replace them, delete
                first in the builder, then re-import.
              </p>
            </div>

            <div className='space-y-1.5'>
              <p className='text-sm font-medium'>Upload a file</p>
              <Input
                type='file'
                accept='.csv,text/csv'
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            <div className='space-y-1.5'>
              <p className='text-sm font-medium'>…or paste rows</p>
              <Textarea
                rows={10}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder='Paste CSV rows (including the header row). The format matches what Download exports — easiest is to download first, edit, and paste back.'
                className='font-mono text-xs'
              />
            </div>

            {csvText.trim() !== '' && (
              <div className='flex items-center gap-3 text-xs'>
                <Badge variant={validCount > 0 ? 'default' : 'destructive'}>
                  {validCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant='destructive'>{errorCount} skipped</Badge>
                )}
                {errorCount > 0 && (
                  <span className='text-muted-foreground line-clamp-1'>
                    e.g. row {parsed.errors[0].rowIndex + 2}:{' '}
                    {parsed.errors[0].reason}
                  </span>
                )}
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || validCount === 0}
              className='gap-1 w-full'
            >
              <Upload className='w-4 h-4' />
              {importMutation.isPending
                ? 'Importing…'
                : validCount > 0
                  ? `Import ${validCount} question${validCount === 1 ? '' : 's'}`
                  : 'Import'}
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
