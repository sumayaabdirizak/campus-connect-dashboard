'use client';

import { Library, Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { BankFilterBar } from './bank-filter-bar';
import { BankQuestionForm } from './bank-question-form';
import { BankQuestionList } from './bank-question-list';
import { CsvImportDialog } from './csv-import-dialog';
import { useQuestionBankManager } from './use-question-bank-manager';

interface QuestionBankManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
}

export function QuestionBankManager({
  open,
  onOpenChange,
  courseOfferingId
}: QuestionBankManagerProps) {
  const m = useQuestionBankManager(courseOfferingId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-5xl max-h-[90vh] overflow-hidden flex flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Library className='w-5 h-5' />
              Question Bank
              <Badge variant='outline' className='tabular-nums'>
                {m.questions.length}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Reusable questions for this course. Drop them into any quiz on this offering
              via &quot;Add from Bank&quot; in the quiz builder.
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-wrap items-center gap-2 border-b pb-3'>
            <BankFilterBar
              filters={m.filters}
              setFilters={m.setFilters}
              topics={m.topics}
              modules={m.modules}
            />
            <div className='ml-auto flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={() => m.setCsvOpen(true)}
              >
                <Upload className='w-3.5 h-3.5' /> Import CSV
              </Button>
              <Button size='sm' className='gap-1' onClick={() => m.setEditor('new')}>
                <Plus className='w-3.5 h-3.5' /> New question
              </Button>
            </div>
          </div>
          <div className='flex-1 flex gap-4 overflow-hidden'>
            <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-2 min-w-0'>
              <BankQuestionList
                questions={m.questions}
                filters={m.filters}
                isLoading={m.isLoading}
                onEdit={m.setEditor}
                onDelete={m.handleDelete}
              />
            </div>
            {m.editor !== null ? (
              <div className='w-[440px] shrink-0 border rounded-xl p-4 bg-muted/20 overflow-y-auto'>
                <BankQuestionForm
                  initial={m.editor === 'new' ? null : m.editor}
                  modules={m.modules}
                  pending={m.formPending}
                  onCancel={() => m.setEditor(null)}
                  onSubmit={m.handleCreateOrUpdate}
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <CsvImportDialog
        open={m.csvOpen}
        onOpenChange={m.setCsvOpen}
        courseOfferingId={courseOfferingId}
      />
    </>
  );
}
