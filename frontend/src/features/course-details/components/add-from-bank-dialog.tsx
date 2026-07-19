'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Library } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBankQuestions,
  useBankTopics,
  useImportToQuiz
} from '../api/question-bank-queries';
import { useModules } from '../api/resources-queries';
import type { BankQuestionFilters } from '../api/question-bank-types';
import { ListSkeleton } from './_shared/list-skeleton';
import { BankFilterBar } from './bank-filter-bar';
import { PickerRow } from './bank-picker-row';

interface AddFromBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
  quizId: number;
}

export function AddFromBankDialog({
  open,
  onOpenChange,
  courseOfferingId,
  quizId
}: AddFromBankDialogProps) {
  const [filters, setFilters] = useState<BankQuestionFilters>({});
  const { data: questions = [], isLoading } = useBankQuestions(
    courseOfferingId,
    filters
  );
  const { data: topics = [] } = useBankTopics(courseOfferingId);
  const { data: modules = [] } = useModules(courseOfferingId);
  const importMutation = useImportToQuiz(courseOfferingId, quizId);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelected(new Set());
      setFilters({});
    }
    onOpenChange(next);
  };

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    questions.length > 0 && questions.every((q) => selected.has(q.id));
  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const q of questions) next.delete(q.id);
      } else {
        for (const q of questions) next.add(q.id);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error('Select at least one question');
      return;
    }
    importMutation.mutate(
      { questionIds: ids },
      {
        onSuccess: (res) => {
          toast.success(`Added ${res.added} question${res.added === 1 ? '' : 's'} to quiz`);
          handleOpenChange(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  const selectedCount = selected.size;
  const hasFilters = !!(
    filters.search ||
    filters.topic ||
    filters.difficulty ||
    filters.moduleId
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-4xl max-h-[85vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Library className='w-5 h-5' />
            Add from Question Bank
            {selectedCount > 0 && (
              <Badge variant='default' className='tabular-nums'>
                {selectedCount} selected
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Pick reusable questions from your bank. Selected rows are copied into the
            quiz, so editing a bank row later won't change quizzes you've already built.
          </DialogDescription>
        </DialogHeader>

        <BankFilterBar
          filters={filters}
          topics={topics}
          modules={modules}
          hasFilters={hasFilters}
          allVisibleSelected={allVisibleSelected}
          questionCount={questions.length}
          onFiltersChange={setFilters}
          onClearFilters={() => setFilters({})}
          onToggleAllVisible={toggleAllVisible}
        />

        <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-1.5'>
          {isLoading ? (
            <ListSkeleton variant='row' count={4} />
          ) : questions.length === 0 ? (
            <div className='border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground'>
              {hasFilters
                ? 'No questions match the current filters.'
                : 'Your bank is empty. Open the Question Bank to add some.'}
            </div>
          ) : (
            questions.map((q) => (
              <PickerRow
                key={q.id}
                q={q}
                checked={selected.has(q.id)}
                onToggle={() => toggle(q.id)}
              />
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={importMutation.isPending || selectedCount === 0}
          >
            {importMutation.isPending
              ? 'Adding…'
              : selectedCount > 0
                ? `Add ${selectedCount} to quiz`
                : 'Add to quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
