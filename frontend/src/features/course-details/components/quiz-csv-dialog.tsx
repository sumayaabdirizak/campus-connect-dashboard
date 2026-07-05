'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { downloadCsv } from './_shared/question-csv';
import {
  QuestionCsvImportPanel,
  useQuestionCsvParse
} from './_shared/question-csv-import-panel';

interface QuizCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
  quizId: number;
  quizTitle: string;
  /** When false, only download is available (published quizzes). */
  canUpload?: boolean;
}

export function QuizCsvDialog({
  open,
  onOpenChange,
  courseOfferingId,
  quizId,
  quizTitle,
  canUpload = true
}: QuizCsvDialogProps) {
  const exportMutation = useExportQuizCsv();
  const importMutation = useImportQuizCsv(courseOfferingId);
  const [tab, setTab] = useState<'download' | 'upload'>('download');
  const [csvText, setCsvText] = useState('');

  const parsed = useQuestionCsvParse(csvText, 'quiz');
  const validCount = parsed.rows.length;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCsvText('');
      setTab('download');
    } else if (!canUpload) {
      setTab('download');
    }
    onOpenChange(next);
  };

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
          handleOpenChange(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md gap-5 p-6'>
        <DialogHeader className='space-y-1.5 text-left'>
          <DialogTitle>CSV import / export</DialogTitle>
          <DialogDescription>
            {canUpload ? (
              <>
                Download or upload questions for{' '}
                <span className='font-medium text-foreground'>{quizTitle}</span>.
              </>
            ) : (
              <>
                Download questions from{' '}
                <span className='font-medium text-foreground'>{quizTitle}</span>. Upload is
                disabled while the quiz is published.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            if (v === 'upload' && !canUpload) return;
            setTab(v as 'download' | 'upload');
          }}
          className='gap-4'
        >
          <TabsList className={`grid h-9 w-full ${canUpload ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value='download' className='gap-1.5 text-sm'>
              <FileDown className='h-3.5 w-3.5' />
              Download
            </TabsTrigger>
            {canUpload ? (
              <TabsTrigger value='upload' className='gap-1.5 text-sm'>
                <FileUp className='h-3.5 w-3.5' />
                Upload
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value='download' className='mt-0 space-y-1'>
            <p className='text-sm text-muted-foreground'>
              Export all questions on this quiz as a{' '}
              <span className='font-medium text-foreground'>.csv</span> file for
              editing in Excel or Google Sheets.
            </p>
          </TabsContent>

          <TabsContent value='upload' className='mt-0 space-y-3'>
            {canUpload ? (
              <>
                <p className='text-sm text-muted-foreground'>
                  Upload a <span className='font-medium text-foreground'>.csv</span>{' '}
                  file to append questions to this quiz. Existing questions are kept.
                </p>
                <QuestionCsvImportPanel
                  key={open ? 'open' : 'closed'}
                  mode='quiz'
                  text={csvText}
                  onTextChange={setCsvText}
                  uploadOnly
                  disabled={importMutation.isPending}
                />
              </>
            ) : null}
          </TabsContent>
        </Tabs>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {tab === 'download' ? (
            <Button
              onClick={handleDownload}
              disabled={exportMutation.isPending}
              className='gap-1.5'
            >
              <Download className='h-4 w-4' />
              {exportMutation.isPending ? 'Preparing…' : 'Download CSV'}
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || validCount === 0}
              className='gap-1.5'
            >
              <Upload className='h-4 w-4' />
              {importMutation.isPending
                ? 'Importing…'
                : validCount > 0
                  ? `Import ${validCount} question${validCount === 1 ? '' : 's'}`
                  : 'Import'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
