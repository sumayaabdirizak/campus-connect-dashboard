'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useImportBankQuestions } from '../../api/question-bank-queries';
import {
  QuestionCsvImportPanel,
  useQuestionCsvParse
} from '../_shared/question-csv-import-panel';

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  courseOfferingId
}: CsvImportDialogProps) {
  const importMutation = useImportBankQuestions(courseOfferingId);
  const [text, setText] = useState('');
  const parsed = useQuestionCsvParse(text, 'bank');
  const validCount = parsed.rows.length;

  const handleOpenChange = (next: boolean) => {
    if (!next) setText('');
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (validCount === 0) {
      toast.error('Nothing to import — check the CSV format');
      return;
    }
    const questions = parsed.rows.map((r) => ({
      question_text: r.question_text,
      question_type: r.question_type,
      points: r.points,
      topic: r.topic,
      difficulty: r.difficulty,
      options: r.question_type === 'SHORT_ANSWER' ? undefined : r.options
    }));
    importMutation.mutate(questions, {
      onSuccess: (res) => {
        toast.success(`Imported ${res.imported} question${res.imported === 1 ? '' : 's'}`);
        handleOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md gap-5 p-6'>
        <DialogHeader className='space-y-1.5 text-left'>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a <span className='font-medium text-foreground'>.csv</span> file to add
            questions to the bank.
          </DialogDescription>
        </DialogHeader>
        <QuestionCsvImportPanel
          key={open ? 'open' : 'closed'}
          mode='bank'
          text={text}
          onTextChange={setText}
          uploadOnly
          disabled={importMutation.isPending}
        />
        <DialogFooter className='gap-2 sm:gap-0'>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
