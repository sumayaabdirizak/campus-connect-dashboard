'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { BookOpen, Library, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useBankQuestions,
  useBankTopics,
  useImportToQuiz
} from '../api/question-bank-queries';
import { useModules } from '../api/resources-queries';
import type { BankQuestion, BankQuestionFilters } from '../api/question-bank-types';
import { ListSkeleton } from './_shared/list-skeleton';

const ANY_VALUE = '__any__';
const NO_MODULE = '__none__';

interface AddFromBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
  quizId: number;
}

/**
 * Multi-select picker that drops bank questions into a quiz. Each selected
 * row is COPIED into the quiz (the backend writes a fresh `QuizQuestion`),
 * so later edits to the bank row never silently mutate the published quiz.
 *
 * Filters are the same as the bank manager — search + topic + difficulty +
 * chapter — so the same mental model carries over. Selection is independent
 * of the filter set: if the teacher selects 3 rows, narrows the filter to
 * hide one of them, and adds, all 3 still get added (we don't punish them
 * for refining the search after picking).
 */
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

  // Selection lives in a Set for O(1) toggle + size lookups. We don't store
  // the BankQuestion objects, just ids — the backend needs only the ids and
  // a stale snapshot is fine if the list reloads mid-pick.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Reset selection when the dialog closes; keep across filter changes.
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

        {/* Filter bar */}
        <div className='flex flex-wrap items-center gap-2 border-b pb-3'>
          <div className='relative w-[220px]'>
            <Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Search'
              className='h-8 pl-7 text-sm'
              value={filters.search ?? ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            />
          </div>
          <Select
            value={filters.topic ?? ANY_VALUE}
            onValueChange={(v) =>
              setFilters({ ...filters, topic: v === ANY_VALUE ? undefined : v })
            }
          >
            <SelectTrigger className='h-8 w-[160px] text-sm'>
              <SelectValue placeholder='Any topic' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any topic</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name} ({t.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.difficulty ?? ANY_VALUE}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                difficulty: v === ANY_VALUE ? undefined : (v as 'easy' | 'medium' | 'hard')
              })
            }
          >
            <SelectTrigger className='h-8 w-[130px] text-sm'>
              <SelectValue placeholder='Any difficulty' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Any difficulty</SelectItem>
              <SelectItem value='easy'>Easy</SelectItem>
              <SelectItem value='medium'>Medium</SelectItem>
              <SelectItem value='hard'>Hard</SelectItem>
            </SelectContent>
          </Select>
          {modules.length > 0 && (
            <Select
              value={
                filters.moduleId === 'none'
                  ? NO_MODULE
                  : typeof filters.moduleId === 'number'
                    ? String(filters.moduleId)
                    : ANY_VALUE
              }
              onValueChange={(v) => {
                if (v === ANY_VALUE) setFilters({ ...filters, moduleId: undefined });
                else if (v === NO_MODULE) setFilters({ ...filters, moduleId: 'none' });
                else setFilters({ ...filters, moduleId: Number(v) });
              }}
            >
              <SelectTrigger className='h-8 w-[160px] text-sm'>
                <SelectValue placeholder='Any chapter' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_VALUE}>Any chapter</SelectItem>
                <SelectItem value={NO_MODULE}>Ungrouped</SelectItem>
                {[...modules]
                  .sort((a, b) => a.position - b.position)
                  .map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {hasFilters && (
            <Button
              variant='ghost'
              size='sm'
              className='gap-1 h-8 text-muted-foreground'
              onClick={() => setFilters({})}
            >
              <X className='w-3.5 h-3.5' /> Clear
            </Button>
          )}
          {questions.length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-8 ml-auto'
              onClick={toggleAllVisible}
            >
              {allVisibleSelected ? 'Deselect all' : 'Select all'}
            </Button>
          )}
        </div>

        {/* List */}
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

/// Single row in the picker. Whole row is clickable for keyboard-friendliness
/// and to dodge the "had to aim at the tiny checkbox" UX gripe.
function PickerRow({
  q,
  checked,
  onToggle
}: {
  q: BankQuestion;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/[0.04]' : 'hover:bg-muted/30'
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className='mt-0.5' />
      <div className='min-w-0 flex-1 space-y-1'>
        <p className='text-sm font-medium line-clamp-2'>{q.question_text}</p>
        <div className='flex items-center gap-1.5 flex-wrap'>
          <Badge variant='outline' className='text-[10px]'>
            {q.question_type.replace('_', ' ')}
          </Badge>
          <Badge variant='outline' className='text-[10px] tabular-nums'>
            {q.points} pt
          </Badge>
          {q.difficulty && (
            <Badge variant='outline' className='text-[10px] capitalize'>
              {q.difficulty}
            </Badge>
          )}
          {q.topic && (
            <Badge variant='outline' className='text-[10px]'>
              {q.topic}
            </Badge>
          )}
          {q.module && (
            <Badge variant='outline' className='text-[10px] gap-1'>
              <BookOpen className='w-3 h-3' />
              {q.module.title}
            </Badge>
          )}
        </div>
      </div>
    </label>
  );
}
