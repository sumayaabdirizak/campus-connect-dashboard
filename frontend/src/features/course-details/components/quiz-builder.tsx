'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  ArrowLeft,
  Check,
  FileSpreadsheet,
  GripVertical,
  Library,
  Plus,
  Sparkles,
  Trash2,
  X as XIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import {
  quizKeys,
  useCreateQuestion,
  useDeleteQuestion,
  useReorderQuestions,
  useUpdateQuestion
} from '../api/quizzes-queries';
import type {
  OptionInput,
  Quiz,
  QuizQuestion,
  QuizQuestionType
} from '../api/quizzes-types';
import { AddFromBankDialog } from './add-from-bank-dialog';
import { AiGenerateDialog } from './ai-generate-dialog';
import { QuizCsvDialog } from './quiz-csv-dialog';

interface QuizBuilderProps {
  courseId: string;
  quiz: Quiz;
  onBack: () => void;
}

interface DraftQuestion {
  // Local-only state for editing. Empty `id` means "not persisted yet".
  id: number | null;
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  correct_answer: string | null;
  /// Teacher-authored explanation shown to the student on the review screen
  /// after submitting. Optional.
  explanation: string;
  options: OptionInput[];
}

const emptyDraft = (existing?: QuizQuestion): DraftQuestion => {
  if (existing) {
    return {
      id: existing.id,
      question_text: existing.question_text,
      question_type: existing.question_type,
      points: existing.points,
      correct_answer: '',
      explanation: existing.explanation ?? '',
      options: existing.options.map((o, i) => ({
        option_text: o.option_text,
        is_correct: !!o.is_correct,
        order_index: o.order_index ?? i
      }))
    };
  }
  return {
    id: null,
    question_text: '',
    question_type: 'MCQ',
    points: 1,
    correct_answer: null,
    explanation: '',
    options: [
      { option_text: '', is_correct: false, order_index: 0 },
      { option_text: '', is_correct: false, order_index: 1 }
    ]
  };
};

const trueFalseOptions = (): OptionInput[] => [
  { option_text: 'True', is_correct: false, order_index: 0 },
  { option_text: 'False', is_correct: false, order_index: 1 }
];

export function QuizBuilder({ courseId, quiz, onBack }: QuizBuilderProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftQuestion | null>(null);
  // Add-from-Bank picker dialog. Lives at the builder level so the picker
  // closes cleanly whenever the user navigates away.
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  // AI generation dialog. Generated questions land in the bank; the teacher
  // then uses "Add from Bank" to attach them to this quiz.
  const [aiOpen, setAiOpen] = useState(false);
  // CSV import/export dialog — bidirectional round-trip for the quiz.
  const [csvOpen, setCsvOpen] = useState(false);
  const createMutation = useCreateQuestion(courseId, quiz.id);
  const updateMutation = useUpdateQuestion(courseId);
  const deleteMutation = useDeleteQuestion(courseId);
  const reorderMutation = useReorderQuestions(courseId);

  // The cached question list is the source of truth for order — DnD-end
  // optimistically rewrites that cache, fires the mutation, and rolls back
  // on failure. We sort here so the local `questions` array always matches
  // what's rendered, regardless of how the API returned it.
  const questions = useMemo(
    () =>
      [...(quiz.questions ?? [])].sort((a, b) => a.order_index - b.order_index),
    [quiz.questions]
  );
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // dnd-kit sensors: pointer for mouse/touch, keyboard for accessibility.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({
      ...q,
      order_index: i,
    }));

    // Optimistic cache update — flip the order locally first so the row
    // doesn't snap back while the server roundtrips. The quizKeys.list cache
    // holds an array of Quiz objects, so we patch the right one in place.
    const key = quizKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Quiz[]>(key);
    queryClient.setQueryData<Quiz[]>(key, (prev) =>
      (prev ?? []).map((q) =>
        q.id === quiz.id ? { ...q, questions: reordered } : q
      )
    );

    reorderMutation.mutate(
      {
        quizId: quiz.id,
        items: reordered.map((q) => ({ id: q.id, order_index: q.order_index })),
      },
      {
        onError: (e: Error) => {
          // Roll back to the pre-drag state.
          if (snapshot) queryClient.setQueryData<Quiz[]>(key, snapshot);
          toast.error(e.message || 'Reorder failed');
        },
      }
    );
  };

  const startNew = () => setDraft(emptyDraft());
  const startEdit = (q: QuizQuestion) => setDraft(emptyDraft(q));
  const cancel = () => setDraft(null);

  const setType = (type: QuizQuestionType) => {
    if (!draft) return;
    if (type === 'TRUE_FALSE') {
      setDraft({ ...draft, question_type: type, options: trueFalseOptions() });
    } else if (type === 'SHORT_ANSWER') {
      setDraft({ ...draft, question_type: type, options: [] });
    } else {
      setDraft({
        ...draft,
        question_type: type,
        options:
          draft.options.length >= 2
            ? draft.options
            : [
                { option_text: '', is_correct: false, order_index: 0 },
                { option_text: '', is_correct: false, order_index: 1 }
              ]
      });
    }
  };

  const updateOption = (i: number, patch: Partial<OptionInput>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      options: draft.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o))
    });
  };

  const addOption = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      options: [
        ...draft.options,
        { option_text: '', is_correct: false, order_index: draft.options.length }
      ]
    });
  };

  const removeOption = (i: number) => {
    if (!draft) return;
    if (draft.options.length <= 2) {
      toast.error('Need at least 2 options');
      return;
    }
    setDraft({
      ...draft,
      options: draft.options
        .filter((_, idx) => idx !== i)
        .map((o, idx) => ({ ...o, order_index: idx }))
    });
  };

  const setCorrectExclusive = (i: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      options: draft.options.map((o, idx) => ({ ...o, is_correct: idx === i }))
    });
  };

  const validateDraft = (): string | null => {
    if (!draft) return 'No draft';
    if (!draft.question_text.trim()) return 'Question text is required';
    if (draft.points <= 0) return 'Points must be greater than zero';
    if (draft.question_type === 'MCQ' || draft.question_type === 'TRUE_FALSE') {
      const filled = draft.options.filter((o) => o.option_text.trim());
      if (filled.length < 2) return 'Need at least 2 non-empty options';
      const correct = draft.options.filter((o) => o.is_correct).length;
      if (correct === 0) return 'Mark exactly one option as correct';
      if (correct > 1 && draft.question_type === 'TRUE_FALSE') {
        return 'Only one True/False answer can be correct';
      }
    }
    return null;
  };

  const save = () => {
    const err = validateDraft();
    if (err) {
      toast.error(err);
      return;
    }
    if (!draft) return;

    const payload = {
      question_text: draft.question_text.trim(),
      question_type: draft.question_type,
      points: Number(draft.points) || 1,
      correct_answer: draft.correct_answer ?? null,
      // Send null when blank so it stays NULL in the DB rather than ""
      // (cleaner downstream: `if (q.explanation)` then render the block).
      explanation: draft.explanation.trim() || null,
      options:
        draft.question_type === 'SHORT_ANSWER'
          ? []
          : draft.options
              .filter((o) => o.option_text.trim())
              .map((o, idx) => ({ ...o, order_index: idx }))
    };

    if (draft.id == null) {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Question added');
          setDraft(null);
        },
        onError: (e: Error) => toast.error(e.message)
      });
    } else {
      updateMutation.mutate(
        { questionId: draft.id, input: payload },
        {
          onSuccess: () => {
            toast.success('Question updated');
            setDraft(null);
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    }
  };

  const handleDelete = (q: QuizQuestion) => {
    if (!confirm(`Delete question "${q.question_text.slice(0, 40)}…"?`)) return;
    deleteMutation.mutate(q.id, {
      onSuccess: () => toast.success('Deleted'),
      onError: (e: Error) => toast.error(e.message)
    });
  };

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1 -ml-2'>
        <ArrowLeft className='w-4 h-4' /> Back to quizzes
      </Button>

      <div className='border rounded-xl p-4 flex items-start justify-between gap-3 bg-muted/30'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='text-xl font-bold truncate'>{quiz.title}</h2>
            {quiz.is_draft && <Badge variant='secondary'>Draft</Badge>}
          </div>
          <p className='text-sm text-muted-foreground mt-1 tabular-nums'>
            {questions.length} question{questions.length === 1 ? '' : 's'} ·{' '}
            {totalPoints} pt total · {quiz.duration_minutes} min · pass ≥ {quiz.passing_score}%
          </p>
        </div>
        <div className='flex gap-2 shrink-0 flex-wrap'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setCsvOpen(true)}
            disabled={draft != null}
            aria-label='Import / export CSV'
            title='Import / export CSV'
          >
            <FileSpreadsheet className='w-4 h-4' />
          </Button>
          <Button
            variant='outline'
            onClick={() => setAiOpen(true)}
            className='gap-1'
            disabled={draft != null}
          >
            <Sparkles className='w-4 h-4' /> Generate with AI
          </Button>
          <Button
            variant='outline'
            onClick={() => setBankPickerOpen(true)}
            className='gap-1'
            disabled={draft != null}
          >
            <Library className='w-4 h-4' /> Add from Bank
          </Button>
          <Button onClick={startNew} className='gap-1' disabled={draft != null}>
            <Plus className='w-4 h-4' /> Add question
          </Button>
        </div>
      </div>

      {/* Existing question list — DnD-reorderable. While a draft editor is
          open we still let drags happen on already-saved questions; the
          edit/delete buttons disable themselves so the teacher doesn't get
          confused about which row is being modified. */}
      <div className='space-y-2'>
        {questions.length === 0 && draft == null && (
          <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground'>
            No questions yet. Click "Add question" to start.
          </div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            {questions.map((q, i) => (
              <SortableQuestionRow
                key={q.id}
                question={q}
                index={i}
                disableActions={draft != null}
                deletePending={deleteMutation.isPending}
                onEdit={() => startEdit(q)}
                onDelete={() => handleDelete(q)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Draft editor */}
      {draft && (
        <div className='border rounded-lg p-4 space-y-3 bg-muted/10'>
          <p className='text-sm font-medium'>
            {draft.id == null ? 'New question' : `Editing question #${draft.id}`}
          </p>

          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-xs'>Type</Label>
              <Select
                value={draft.question_type}
                onValueChange={(v) => setType(v as QuizQuestionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='MCQ'>Multiple choice</SelectItem>
                  <SelectItem value='TRUE_FALSE'>True / False</SelectItem>
                  <SelectItem value='SHORT_ANSWER'>Short answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>Points</Label>
              <Input
                type='number'
                min={1}
                value={draft.points}
                onChange={(e) =>
                  setDraft({ ...draft, points: Number(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          <div className='space-y-1'>
            <Label className='text-xs'>Question</Label>
            <Textarea
              rows={2}
              value={draft.question_text}
              onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              placeholder='Type the question…'
            />
          </div>

          <div className='space-y-1'>
            <Label className='text-xs flex items-center gap-1'>
              Explanation
              <span className='text-muted-foreground font-normal'>(shown to students after submit)</span>
            </Label>
            <Textarea
              rows={2}
              value={draft.explanation}
              onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
              placeholder='Optional — explain why the correct answer is correct, or link to the source material.'
            />
          </div>

          {draft.question_type === 'SHORT_ANSWER' ? (
            <p className='text-xs text-muted-foreground'>
              Students will type a free-form answer; you'll grade it manually.
            </p>
          ) : (
            <div className='space-y-2'>
              <Label className='text-xs'>Options (one correct)</Label>
              {draft.options.map((o, i) => (
                <div key={i} className='flex items-center gap-2'>
                  <input
                    type='radio'
                    checked={o.is_correct}
                    onChange={() => setCorrectExclusive(i)}
                    aria-label={`Mark option ${i + 1} as correct`}
                  />
                  <Input
                    value={o.option_text}
                    onChange={(e) => updateOption(i, { option_text: e.target.value })}
                    placeholder={`Option ${i + 1}`}
                    disabled={draft.question_type === 'TRUE_FALSE'}
                  />
                  {draft.question_type === 'MCQ' && draft.options.length > 2 && (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 text-muted-foreground'
                      onClick={() => removeOption(i)}
                      aria-label='Remove option'
                    >
                      <XIcon className='w-3.5 h-3.5' />
                    </Button>
                  )}
                </div>
              ))}
              {draft.question_type === 'MCQ' && (
                <Button variant='outline' size='sm' className='gap-1' onClick={addOption}>
                  <Plus className='w-3.5 h-3.5' /> Add option
                </Button>
              )}
            </div>
          )}

          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={cancel}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : 'Save question'}
            </Button>
          </div>
        </div>
      )}

      {/* Add-from-Bank picker. Mounted once, controlled via open state.
          Selected rows get COPIED into the quiz (the backend writes fresh
          QuizQuestion rows), so the picker can safely close + the list
          query refetch picks up the new rows automatically. */}
      <AddFromBankDialog
        open={bankPickerOpen}
        onOpenChange={setBankPickerOpen}
        courseOfferingId={courseId}
        quizId={quiz.id}
      />

      {/* AI generation dialog. We persist into the bank (not directly into
          the quiz) so the questions are reusable across other quizzes and
          the teacher gets a chance to review them in the bank UI before
          attaching. The "Add from Bank" picker is the next step they'd
          take to bring them into this specific quiz. */}
      <AiGenerateDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        courseOfferingId={courseId}
        destination={{ kind: 'quiz', quizId: quiz.id }}
      />

      {/* CSV round-trip — download all questions as CSV, or upload a CSV
          to append questions. Useful for bulk editing in Excel/Sheets and
          for sharing question templates with co-teachers. */}
      <QuizCsvDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        courseOfferingId={courseId}
        quizId={quiz.id}
        quizTitle={quiz.title}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable row — the GripVertical icon receives the drag listeners directly,
// so clicking Edit / Delete / scrolling the row doesn't accidentally start a
// drag. While dragging, the row gets a subtle z-index bump + shadow.
// ─────────────────────────────────────────────────────────────────────────────

interface SortableQuestionRowProps {
  question: QuizQuestion;
  index: number;
  disableActions: boolean;
  deletePending: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableQuestionRow({
  question: q,
  index: i,
  disableActions,
  deletePending,
  onEdit,
  onDelete,
}: SortableQuestionRowProps) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } =
    useSortable({ id: q.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-lg p-4 bg-background ${
        isDragging ? 'shadow-lg ring-1 ring-primary/30' : ''
      }`}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-start gap-2 min-w-0'>
          <button
            type='button'
            className='cursor-grab active:cursor-grabbing text-muted-foreground/70 hover:text-muted-foreground p-1 -ml-1 mt-0.5'
            aria-label={`Drag to reorder question ${i + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className='w-4 h-4' />
          </button>
          <div className='min-w-0'>
            <p className='font-medium'>
              {i + 1}. {q.question_text}
            </p>
            <div className='flex gap-2 mt-1 flex-wrap'>
              <Badge variant='outline' className='text-[10px]'>
                {q.question_type.replace('_', ' ')}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                {q.points} pt
              </Badge>
              {q.explanation && (
                <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                  Explanation
                </Badge>
              )}
            </div>
            {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 && (
              <ul className='mt-2 space-y-1'>
                {q.options.map((o) => (
                  <li
                    key={o.id}
                    className={`text-xs flex items-center gap-2 ${
                      o.is_correct
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {o.is_correct && <Check className='w-3 h-3' />}
                    <span>{o.option_text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className='flex gap-1 shrink-0'>
          <Button variant='outline' size='sm' onClick={onEdit} disabled={disableActions}>
            Edit
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='text-destructive'
            onClick={onDelete}
            disabled={deletePending || disableActions}
          >
            <Trash2 className='w-4 h-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
