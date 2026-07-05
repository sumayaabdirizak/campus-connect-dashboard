'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import {
  BookOpen,
  CheckCircle2,
  Library,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { confirmDelete, showToast } from '@/lib/notifications';
import { toast } from 'sonner';
import {
  useBankQuestions,
  useBankTopics,
  useCreateBankQuestion,
  useDeleteBankQuestion,
  useImportBankQuestions,
  useUpdateBankQuestion
} from '../api/question-bank-queries';
import { useModules } from '../api/resources-queries';
import type {
  BankQuestion,
  BankQuestionFilters,
  CreateBankQuestionInput,
  UpdateBankQuestionInput
} from '../api/question-bank-types';
import type { CourseModule } from '../api/resources-types';
import type { QuizQuestionType } from '../api/quizzes-types';
import {
  QuestionCsvImportPanel,
  useQuestionCsvParse
} from './_shared/question-csv-import-panel';

/// Select sentinels — shadcn's Select can't take `""` as a value. We map back
/// to `undefined` (filters) or `null` (form fields) when serialising.
const ANY_VALUE = '__any__';
const NO_MODULE = '__none__';

interface QuestionBankManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
}

/**
 * Full Question Bank UI: filterable list of reusable questions, create /
 * edit form, CSV import, soft-delete. Opens from the Quizzes tab header.
 *
 * Layout: a single wide dialog with a two-pane feel — the filter bar +
 * action buttons sit at the top, the list takes the middle, and a slide-in
 * editor panel appears on the right when the teacher hits "New" or edits a
 * row. Keeps everything on one screen so the teacher can browse and edit
 * without losing context.
 */
export function QuestionBankManager({
  open,
  onOpenChange,
  courseOfferingId
}: QuestionBankManagerProps) {
  const [filters, setFilters] = useState<BankQuestionFilters>({});
  const { data: questions = [], isLoading } = useBankQuestions(
    courseOfferingId,
    filters
  );
  const { data: topics = [] } = useBankTopics(courseOfferingId);
  const { data: modules = [] } = useModules(courseOfferingId);

  const createMutation = useCreateBankQuestion(courseOfferingId);
  const updateMutation = useUpdateBankQuestion(courseOfferingId);
  const deleteMutation = useDeleteBankQuestion(courseOfferingId);

  /// `null`  — list view (no editor)
  /// `'new'` — sentinel for "create" mode
  /// BankQuestion — edit mode for that row
  const [editor, setEditor] = useState<BankQuestion | 'new' | null>(null);

  // CSV import flow lives in its own dialog so the manager stays focused.
  const [csvOpen, setCsvOpen] = useState(false);

  const totalCount = questions.length;

  const handleCreateOrUpdate = (payload: CreateBankQuestionInput) => {
    if (editor === 'new' || editor === null) {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Question added to bank');
          setEditor(null);
        },
        onError: (e: Error) => toast.error(e.message)
      });
    } else {
      updateMutation.mutate(
        { questionId: editor.id, input: payload as UpdateBankQuestionInput },
        {
          onSuccess: () => {
            toast.success('Question updated');
            setEditor(null);
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
    }
  };

  const handleDelete = async (q: BankQuestion) => {
    if (!(await confirmDelete(q.question_text.slice(0, 60)))) return;
    deleteMutation.mutate(q.id, {
      onSuccess: () => showToast('success', 'Question deleted'),
      onError: (e: Error) => showToast('error', e.message)
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-5xl max-h-[90vh] overflow-hidden flex flex-col'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Library className='w-5 h-5' />
              Question Bank
              <Badge variant='outline' className='tabular-nums'>
                {totalCount}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Reusable questions for this course. Drop them into any quiz on this offering
              via "Add from Bank" in the quiz builder.
            </DialogDescription>
          </DialogHeader>

          {/* Action bar — sticky-ish */}
          <div className='flex flex-wrap items-center gap-2 border-b pb-3'>
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              topics={topics}
              modules={modules}
            />
            <div className='ml-auto flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                onClick={() => setCsvOpen(true)}
              >
                <Upload className='w-3.5 h-3.5' /> Import CSV
              </Button>
              <Button size='sm' className='gap-1' onClick={() => setEditor('new')}>
                <Plus className='w-3.5 h-3.5' /> New question
              </Button>
            </div>
          </div>

          {/* Two-pane body */}
          <div className='flex-1 flex gap-4 overflow-hidden'>
            <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-2 min-w-0'>
              {isLoading ? (
                <div className='text-sm text-muted-foreground py-8 text-center'>
                  Loading…
                </div>
              ) : questions.length === 0 ? (
                <div className='border border-dashed rounded-lg p-10 text-center text-sm text-muted-foreground'>
                  {Object.keys(filters).length === 0
                    ? 'Your bank is empty. Click "New question" to add one, or "Import CSV" to bulk-load.'
                    : 'No questions match the current filters.'}
                </div>
              ) : (
                questions.map((q) => (
                  <BankRow
                    key={q.id}
                    q={q}
                    onEdit={() => setEditor(q)}
                    onDelete={() => handleDelete(q)}
                  />
                ))
              )}
            </div>

            {/* Editor panel — only renders when editing or creating. */}
            {editor !== null && (
              <div className='w-[440px] shrink-0 border rounded-xl p-4 bg-muted/20 overflow-y-auto'>
                <BankQuestionForm
                  initial={editor === 'new' ? null : editor}
                  modules={modules}
                  pending={createMutation.isPending || updateMutation.isPending}
                  onCancel={() => setEditor(null)}
                  onSubmit={handleCreateOrUpdate}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CsvImportDialog
        open={csvOpen}
        onOpenChange={setCsvOpen}
        courseOfferingId={courseOfferingId}
      />
    </>
  );
}

// ─── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  filters,
  setFilters,
  topics,
  modules
}: {
  filters: BankQuestionFilters;
  setFilters: (next: BankQuestionFilters) => void;
  topics: Array<{ name: string; count: number }>;
  modules: CourseModule[];
}) {
  const hasFilters = !!(filters.search || filters.topic || filters.difficulty || filters.moduleId);
  return (
    <div className='flex flex-wrap items-center gap-2 min-w-0'>
      <div className='relative w-[220px]'>
        <Search className='w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Search question text'
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
    </div>
  );
}

// ─── Single row in the list ─────────────────────────────────────────────────

function BankRow({
  q,
  onEdit,
  onDelete
}: {
  q: BankQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const correctCount = q.bankOptions.filter((o) => o.is_correct).length;
  return (
    <div className='group border rounded-lg p-3 hover:bg-muted/30 transition-colors'>
      <div className='flex items-start gap-3'>
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
            {q.question_type !== 'SHORT_ANSWER' && (
              <span className='text-[10px] text-muted-foreground tabular-nums'>
                {q.bankOptions.length} option{q.bankOptions.length === 1 ? '' : 's'}
                {correctCount > 0 ? ` · ${correctCount} correct` : ''}
              </span>
            )}
          </div>
        </div>
        <div className='flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity'>
          <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onEdit}>
            <Pencil className='w-3.5 h-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-7 w-7 text-destructive'
            onClick={onDelete}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Create / edit form ────────────────────────────────────────────────────

interface FormDraft {
  question_text: string;
  question_type: QuizQuestionType;
  points: number;
  topic: string;
  difficulty: '' | 'easy' | 'medium' | 'hard';
  moduleId: string; // NO_MODULE or numeric string
  options: Array<{ option_text: string; is_correct: boolean }>;
}

function makeBlankDraft(): FormDraft {
  return {
    question_text: '',
    question_type: 'MCQ',
    points: 1,
    topic: '',
    difficulty: '',
    moduleId: NO_MODULE,
    options: [
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  };
}

function fromBank(q: BankQuestion): FormDraft {
  return {
    question_text: q.question_text,
    question_type: q.question_type,
    points: q.points,
    topic: q.topic ?? '',
    difficulty: q.difficulty ?? '',
    moduleId: q.moduleId == null ? NO_MODULE : String(q.moduleId),
    options: q.bankOptions.map((o) => ({
      option_text: o.option_text,
      is_correct: o.is_correct
    }))
  };
}

function BankQuestionForm({
  initial,
  modules,
  pending,
  onCancel,
  onSubmit
}: {
  initial: BankQuestion | null;
  modules: CourseModule[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateBankQuestionInput) => void;
}) {
  // Seed the draft when the row being edited changes. Using the id (or
  // 'new' sentinel) as the dependency means switching rows resets cleanly,
  // while in-progress edits to the SAME row are preserved across re-renders
  // (the parent refetch swaps `initial`'s object identity but keeps the id).
  const initialId = initial?.id ?? 'new';
  const [draft, setDraft] = useState<FormDraft>(() =>
    initial ? fromBank(initial) : makeBlankDraft()
  );
  useEffect(() => {
    setDraft(initial ? fromBank(initial) : makeBlankDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const isShortAnswer = draft.question_type === 'SHORT_ANSWER';

  const updateOption = (idx: number, patch: Partial<{ option_text: string; is_correct: boolean }>) => {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    }));
  };

  const addOption = () => {
    if (draft.options.length >= 6) return;
    setDraft((d) => ({
      ...d,
      options: [...d.options, { option_text: '', is_correct: false }]
    }));
  };
  const removeOption = (idx: number) => {
    if (draft.options.length <= 2 && !isShortAnswer) return;
    setDraft((d) => ({ ...d, options: d.options.filter((_, i) => i !== idx) }));
  };

  /// Single-correct toggle for True/False — clicking one option sets it
  /// correct and forces the other to false.
  const markSingleCorrect = (idx: number) => {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, i) => ({ ...o, is_correct: i === idx }))
    }));
  };

  const switchType = (next: QuizQuestionType) => {
    setDraft((d) => {
      if (next === 'TRUE_FALSE') {
        return {
          ...d,
          question_type: next,
          options: [
            { option_text: 'True', is_correct: d.options[0]?.is_correct ?? false },
            { option_text: 'False', is_correct: d.options[1]?.is_correct ?? false }
          ]
        };
      }
      if (next === 'SHORT_ANSWER') {
        return { ...d, question_type: next, options: [] };
      }
      // MCQ — ensure at least 2 rows.
      const opts =
        d.options.length >= 2
          ? d.options
          : [
              ...d.options,
              ...Array(2 - d.options.length).fill({ option_text: '', is_correct: false })
            ];
      return { ...d, question_type: next, options: opts };
    });
  };

  const validate = (): string | null => {
    if (!draft.question_text.trim()) return 'Question text is required';
    if (draft.points <= 0) return 'Points must be greater than 0';
    if (!isShortAnswer) {
      const opts = draft.options.filter((o) => o.option_text.trim() !== '');
      if (opts.length < 2) return 'At least 2 options required';
      if (!opts.some((o) => o.is_correct)) return 'Mark at least one option as correct';
      if (draft.question_type === 'TRUE_FALSE' && opts.filter((o) => o.is_correct).length > 1) {
        return 'True/False allows only one correct option';
      }
    }
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    onSubmit({
      question_text: draft.question_text.trim(),
      question_type: draft.question_type,
      points: draft.points,
      topic: draft.topic.trim() || null,
      difficulty: (draft.difficulty || null) as 'easy' | 'medium' | 'hard' | null,
      moduleId: draft.moduleId === NO_MODULE ? null : Number(draft.moduleId),
      options: isShortAnswer
        ? undefined
        : draft.options
            .filter((o) => o.option_text.trim() !== '')
            .map((o, idx) => ({
              option_text: o.option_text.trim(),
              is_correct: o.is_correct,
              order_index: idx
            }))
    });
  };

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold'>{initial ? 'Edit question' : 'New question'}</h3>
        <Button variant='ghost' size='sm' onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='bank-q-text'>Question</Label>
        <Textarea
          id='bank-q-text'
          rows={3}
          value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
        />
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-1.5'>
          <Label>Type</Label>
          <Select
            value={draft.question_type}
            onValueChange={(v) => switchType(v as QuizQuestionType)}
          >
            <SelectTrigger className='h-9 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='MCQ'>Multiple choice</SelectItem>
              <SelectItem value='TRUE_FALSE'>True / False</SelectItem>
              <SelectItem value='SHORT_ANSWER'>Short answer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='bank-q-points'>Points</Label>
          <Input
            id='bank-q-points'
            type='number'
            min={0.5}
            max={100}
            step={0.5}
            value={draft.points}
            onChange={(e) =>
              setDraft({ ...draft, points: Math.max(0.5, Number(e.target.value) || 1) })
            }
          />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-1.5'>
          <Label htmlFor='bank-q-topic'>Topic</Label>
          <Input
            id='bank-q-topic'
            placeholder='e.g. Sorting'
            value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Difficulty</Label>
          <Select
            value={draft.difficulty || ANY_VALUE}
            onValueChange={(v) =>
              setDraft({
                ...draft,
                difficulty: v === ANY_VALUE ? '' : (v as 'easy' | 'medium' | 'hard')
              })
            }
          >
            <SelectTrigger className='h-9 text-sm'>
              <SelectValue placeholder='Unset' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_VALUE}>Unset</SelectItem>
              <SelectItem value='easy'>Easy</SelectItem>
              <SelectItem value='medium'>Medium</SelectItem>
              <SelectItem value='hard'>Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {modules.length > 0 && (
        <div className='space-y-1.5'>
          <Label className='flex items-center gap-1'>
            <BookOpen className='w-3.5 h-3.5' /> Chapter
          </Label>
          <Select
            value={draft.moduleId}
            onValueChange={(v) => setDraft({ ...draft, moduleId: v })}
          >
            <SelectTrigger className='h-9 text-sm'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
        </div>
      )}

      {!isShortAnswer && (
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <Label>Options</Label>
            {draft.question_type === 'MCQ' && draft.options.length < 6 && (
              <Button variant='ghost' size='sm' className='gap-1' onClick={addOption}>
                <Plus className='w-3 h-3' /> Add option
              </Button>
            )}
          </div>
          <div className='space-y-1.5'>
            {draft.options.map((opt, idx) => (
              <div key={idx} className='flex items-center gap-2'>
                <button
                  type='button'
                  className='shrink-0'
                  onClick={() => {
                    if (draft.question_type === 'TRUE_FALSE') markSingleCorrect(idx);
                    else updateOption(idx, { is_correct: !opt.is_correct });
                  }}
                  aria-label={opt.is_correct ? 'Marked correct' : 'Mark correct'}
                >
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      opt.is_correct ? 'text-emerald-600' : 'text-muted-foreground/40'
                    }`}
                  />
                </button>
                <Input
                  className='h-8 text-sm'
                  placeholder={`Option ${idx + 1}`}
                  value={opt.option_text}
                  onChange={(e) => updateOption(idx, { option_text: e.target.value })}
                  disabled={draft.question_type === 'TRUE_FALSE'}
                />
                {draft.question_type === 'MCQ' && draft.options.length > 2 && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 text-destructive'
                    onClick={() => removeOption(idx)}
                  >
                    <X className='w-3.5 h-3.5' />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='flex justify-end gap-2 pt-2'>
        <Button variant='outline' onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Add to bank'}
        </Button>
      </div>
    </div>
  );
}

// ─── CSV import dialog ─────────────────────────────────────────────────────

function CsvImportDialog({
  open,
  onOpenChange,
  courseOfferingId
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
}) {
  const importMutation = useImportBankQuestions(courseOfferingId);
  const [text, setText] = useState('');

  const parsed = useQuestionCsvParse(text, 'bank');
  const validCount = parsed.rows.length;

  const handleSubmit = () => {
    if (validCount === 0) {
      toast.error('Nothing to import — check the CSV format');
      return;
    }
    // Map ParsedQuestionRow[] → CreateBankQuestionInput[]. The existing
    // bank import mutation expects this shape; we strip `explanation` and
    // omit the options field on short-answer rows.
    const questions = parsed.rows.map((r) => ({
      question_text: r.question_text,
      question_type: r.question_type,
      points: r.points,
      topic: r.topic,
      difficulty: r.difficulty,
      options:
        r.question_type === 'SHORT_ANSWER' ? undefined : r.options
    }));
    importMutation.mutate(questions, {
      onSuccess: (res) => {
        toast.success(`Imported ${res.imported} question${res.imported === 1 ? '' : 's'}`);
        handleOpenChange(false);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setText('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-md gap-5 p-6'>
        <DialogHeader className='space-y-1.5 text-left'>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Upload a <span className='font-medium text-foreground'>.csv</span> file to add questions
            to the bank.
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

// CSV parser + row tokenizer moved to ./_shared/question-csv.ts so the
// quiz round-trip dialog can reuse the exact same logic. See that module
// for the full implementation + the symmetric `buildQuestionCsv` writer.
