'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
  X,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGenerateQuestions,
  useImportBankQuestions,
  useImportToQuiz
} from '../api/question-bank-queries';
import { useCreateQuiz } from '../api/quizzes-queries';
import type {
  GeneratedQuestion,
  GenerateQuestionsInput
} from '../api/question-bank-types';
import type { CreateQuizInput, Quiz, QuizQuestionType } from '../api/quizzes-types';
import {
  AI_SOURCE_ACCEPT,
  AI_SOURCE_MAX_CHARS,
  clampSourceMaterial,
  extractSourceTextFromFile
} from './_shared/extract-source-text';

/// Three destinations the teacher can target with the generated questions:
///   - 'bank'     → save into the offering's Question Bank (no quizId needed)
///   - 'quiz'     → also persist into the bank, then forward to the quiz
///                  builder (we route via the bank so the rows exist for
///                  re-use later)
///   - 'new-quiz' → create a brand-new DRAFT quiz seeded with the kept
///                  questions in a single request, then drop the teacher into
///                  the builder. Explanations are preserved (quiz questions
///                  carry them, unlike bank rows).
type Destination =
  | { kind: 'bank' }
  | { kind: 'quiz'; quizId: number }
  | { kind: 'new-quiz' };

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseOfferingId: string;
  /// Where the accepted questions should land. The surfaces share the same
  /// dialog because the config + preview UX is identical — only the final
  /// save action differs.
  destination: Destination;
  /// Called after a `new-quiz` destination successfully creates the quiz.
  /// The teacher list wires this to open the freshly-created draft in the
  /// QuizBuilder. Ignored for the other destinations.
  onQuizCreated?: (quiz: Quiz) => void;
}

/**
 * AI question generator dialog.
 *
 * Phase 1 — Config: teacher writes a prompt, optionally pastes source
 *           material, picks count + types + difficulty, hits "Generate".
 *
 * Phase 2 — Preview: the generated questions render as a multi-select list.
 *           Teacher toggles which to keep (defaults to all selected), then
 *           hits "Save". On save we either bulk-import into the bank, or
 *           import then attach to the quiz.
 *
 * Failure modes:
 *   - 503 from the backend → AI is disabled (no API key). Surfaced as an
 *     error toast with the message from the service.
 *   - 429 → rate limited. Toast tells the teacher to retry shortly.
 *   - Any other error → generic toast with the server's message.
 */
export function AiGenerateDialog({
  open,
  onOpenChange,
  courseOfferingId,
  destination,
  onQuizCreated
}: AiGenerateDialogProps) {
  const isNewQuiz = destination.kind === 'new-quiz';
  const generateMutation = useGenerateQuestions(courseOfferingId);
  const importMutation = useImportBankQuestions(courseOfferingId);
  const createQuizMutation = useCreateQuiz(courseOfferingId);
  // Import-to-quiz is only used when destination.kind === 'quiz'. We always
  // construct the hook (rules-of-hooks), but only invoke it conditionally.
  // `quizId: 0` is a safe placeholder — we never call the mutate function
  // unless destination.kind === 'quiz', at which point we use the real id.
  const importToQuizMutation = useImportToQuiz(
    courseOfferingId,
    destination.kind === 'quiz' ? destination.quizId : 0
  );

  // Phase tracking: 'config' shows the form, 'preview' shows the picker.
  // We don't use a wizard library — two states is plenty.
  const [phase, setPhase] = useState<'config' | 'preview'>('config');

  // Config form state
  // Title for the new quiz — only used (and required) when destination is
  // 'new-quiz'. Ignored for the bank / existing-quiz destinations.
  const [quizTitle, setQuizTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [isExtractingSource, setIsExtractingSource] = useState(false);
  const [count, setCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<QuizQuestionType[]>([
    'MCQ'
  ]);
  const [difficulty, setDifficulty] = useState<
    'easy' | 'medium' | 'hard' | 'mixed'
  >('mixed');

  // Preview state — generated questions + which ones the teacher is keeping.
  // The set holds indexes into `generated`, not ids, because the rows are
  // unsaved at this point (no server-assigned ids yet).
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [keepSet, setKeepSet] = useState<Set<number>>(new Set());

  // Reset everything when the dialog closes, so re-opening starts fresh.
  // We don't reset on success — the closeHandler below does that.
  const closeHandler = (next: boolean) => {
    if (!next) {
      setPhase('config');
      setQuizTitle('');
      setPrompt('');
      setSourceMaterial('');
      setSourceFileName(null);
      setIsExtractingSource(false);
      setCount(10);
      setQuestionTypes(['MCQ']);
      setDifficulty('mixed');
      setGenerated([]);
      setKeepSet(new Set());
    }
    onOpenChange(next);
  };

  const toggleType = (t: QuizQuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleSourceFile = async (file: File | undefined) => {
    if (!file) return;
    setIsExtractingSource(true);
    try {
      const extracted = await extractSourceTextFromFile(file);
      if (!extracted.trim()) {
        toast.error('No readable text found in that file');
        return;
      }

      const header = `--- ${file.name} ---`;
      const merged = sourceMaterial.trim()
        ? `${sourceMaterial.trim()}\n\n${header}\n\n${extracted.trim()}`
        : `${header}\n\n${extracted.trim()}`;

      const clamped = clampSourceMaterial(merged);
      if (clamped.length < merged.length) {
        toast.warning(
          `Source text was trimmed to ${AI_SOURCE_MAX_CHARS.toLocaleString()} characters`
        );
      }

      setSourceMaterial(clamped);
      setSourceFileName(file.name);
      toast.success(`Loaded text from ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read that file');
    } finally {
      setIsExtractingSource(false);
    }
  };

  const handleGenerate = () => {
    if (isNewQuiz && !quizTitle.trim()) {
      toast.error('Give the quiz a title first');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Describe what you want — even a sentence helps');
      return;
    }
    const input: GenerateQuestionsInput = {
      prompt: prompt.trim(),
      sourceMaterial: sourceMaterial.trim() || undefined,
      count,
      questionTypes,
      difficulty
    };
    generateMutation.mutate(input, {
      onSuccess: (res) => {
        if (!res.questions || res.questions.length === 0) {
          toast.error('No questions returned — try a more specific prompt');
          return;
        }
        setGenerated(res.questions);
        // Default to all selected — the teacher uncheck what they don't want.
        // Easier than starting empty and re-checking 20 boxes.
        setKeepSet(new Set(res.questions.map((_, i) => i)));
        setPhase('preview');
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  const toggleKeep = (idx: number) => {
    setKeepSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (keepSet.size === generated.length) {
      setKeepSet(new Set());
    } else {
      setKeepSet(new Set(generated.map((_, i) => i)));
    }
  };

  const handleSave = () => {
    const chosen = generated.filter((_, i) => keepSet.has(i));
    if (chosen.length === 0) {
      toast.error('Select at least one question to save');
      return;
    }

    // ── new-quiz: create a draft quiz seeded with the kept questions ───────
    // Unlike the bank path, quiz questions DO carry explanations, so we keep
    // them. The backend stamps order_index from array position. We create the
    // quiz as a draft so the teacher reviews + publishes from the builder.
    if (destination.kind === 'new-quiz') {
      const title = quizTitle.trim();
      if (!title) {
        toast.error('Give the quiz a title before saving');
        return;
      }
      const input: CreateQuizInput = {
        title,
        is_draft: true,
        questions: chosen.map((q) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          explanation: q.explanation || null,
          options:
            q.question_type === 'SHORT_ANSWER'
              ? undefined
              : q.options.map((o, idx) => ({
                  option_text: o.option_text,
                  is_correct: o.is_correct,
                  order_index: idx
                }))
        }))
      };
      createQuizMutation.mutate(input, {
        onSuccess: (quiz) => {
          toast.success(
            `Created "${quiz.title}" with ${chosen.length} question${chosen.length === 1 ? '' : 's'} — review & publish when ready`
          );
          onQuizCreated?.(quiz);
          closeHandler(false);
        },
        onError: (e: Error) => toast.error(e.message)
      });
      return;
    }

    // Strip `explanation` here — the bank's `CreateBankQuestionInput` doesn't
    // accept it (explanations live on QuizQuestion, not on the bank row).
    // The bulk-import endpoint silently ignores extra fields, but cleaning
    // them out keeps the request shape tidy.
    const toImport = chosen.map((q) => ({
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      topic: q.topic || null,
      difficulty: q.difficulty,
      options:
        q.question_type === 'SHORT_ANSWER'
          ? undefined
          : q.options.map((o, idx) => ({
              option_text: o.option_text,
              is_correct: o.is_correct,
              order_index: idx
            }))
    }));

    importMutation.mutate(toImport, {
      onSuccess: (res) => {
        toast.success(
          `Added ${res.imported} question${res.imported === 1 ? '' : 's'} to bank`
        );

        // If the dialog was opened from the quiz builder, also forward
        // the just-imported rows into the quiz. We don't know their server
        // ids yet (bulk-import returns a count), so we instead invalidate
        // the bank list — the quiz builder caller can show a toast hint
        // pointing the teacher at the "Add from Bank" picker. Simpler than
        // returning ids from the bulk-import endpoint and matching them up.
        if (destination.kind === 'quiz') {
          toast.message('Open "Add from Bank" to attach them to the quiz', {
            duration: 6000
          });
        }
        closeHandler(false);
      },
      onError: (e: Error) => toast.error(e.message)
    });
  };

  const isGenerating = generateMutation.isPending;
  const isSaving =
    importMutation.isPending ||
    importToQuizMutation.isPending ||
    createQuizMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={closeHandler}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-primary' />
            Generate with AI
            {phase === 'preview' && (
              <Badge variant='secondary' className='tabular-nums'>
                {keepSet.size} / {generated.length} keeping
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {phase === 'config'
              ? 'Describe what you want and the AI will draft questions for you to review.'
              : isNewQuiz
                ? 'Review and uncheck anything you don\'t want — the rest become a new draft quiz.'
                : 'Review and uncheck anything you don\'t want before saving to the bank.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Phase 1: Config form ─────────────────────────────────────── */}
        {phase === 'config' && (
          <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-4'>
            {isNewQuiz && (
              <div className='space-y-1.5'>
                <Label htmlFor='ai-quiz-title'>Quiz title *</Label>
                <Input
                  id='ai-quiz-title'
                  placeholder='e.g. "Chapter 3 — Photosynthesis"'
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            )}

            <div className='space-y-1.5'>
              <Label htmlFor='ai-prompt'>What should the questions cover? *</Label>
              <Textarea
                id='ai-prompt'
                rows={3}
                placeholder='e.g. "10 questions on photosynthesis covering light-dependent and light-independent reactions, mix of conceptual and application questions"'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='ai-source'>
                Source material{' '}
                <span className='text-muted-foreground font-normal'>
                  (optional — chapter text, lecture notes, etc.)
                </span>
              </Label>

              <div className='flex flex-wrap items-center gap-2'>
                <Input
                  id='ai-source-file'
                  type='file'
                  accept={AI_SOURCE_ACCEPT}
                  disabled={isGenerating || isExtractingSource}
                  className='max-w-xs text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs'
                  onChange={(e) => {
                    void handleSourceFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                {sourceFileName ? (
                  <Badge variant='secondary' className='gap-1 text-[11px] font-normal'>
                    <FileText className='w-3 h-3' />
                    {sourceFileName}
                    <button
                      type='button'
                      className='ml-0.5 rounded-sm hover:bg-muted'
                      aria-label='Clear loaded file label'
                      onClick={() => setSourceFileName(null)}
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </Badge>
                ) : null}
                {isExtractingSource ? (
                  <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground'>
                    <Loader2 className='w-3 h-3 animate-spin' />
                    Reading file…
                  </span>
                ) : null}
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Upload PDF, DOCX, or plain text (.txt, .md, .csv) — extracted text appears below.
                You can still paste or edit manually.
              </p>

              <Textarea
                id='ai-source'
                rows={6}
                placeholder='Paste reference material here, or upload a file above. When provided, the AI grounds every question in this content instead of guessing.'
                value={sourceMaterial}
                onChange={(e) => {
                  setSourceMaterial(e.target.value.slice(0, AI_SOURCE_MAX_CHARS));
                  if (!e.target.value.trim()) setSourceFileName(null);
                }}
                disabled={isGenerating || isExtractingSource}
                className='font-mono text-xs select-text'
              />
              <p className='text-[11px] text-muted-foreground tabular-nums'>
                {sourceMaterial.length.toLocaleString()} / {AI_SOURCE_MAX_CHARS.toLocaleString()}{' '}
                characters
              </p>
            </div>

            <div className='grid grid-cols-3 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='ai-count'>Number of questions</Label>
                <Input
                  id='ai-count'
                  type='number'
                  min={1}
                  max={25}
                  value={count}
                  onChange={(e) =>
                    setCount(
                      Math.min(25, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  disabled={isGenerating}
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) =>
                    setDifficulty(v as 'easy' | 'medium' | 'hard' | 'mixed')
                  }
                  disabled={isGenerating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='mixed'>Mixed</SelectItem>
                    <SelectItem value='easy'>Easy</SelectItem>
                    <SelectItem value='medium'>Medium</SelectItem>
                    <SelectItem value='hard'>Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label>Types</Label>
                <div className='flex flex-col gap-1 text-xs'>
                  {(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map((t) => (
                    <label
                      key={t}
                      className='inline-flex items-center gap-1.5 cursor-pointer'
                    >
                      <Checkbox
                        checked={questionTypes.includes(t)}
                        onCheckedChange={() => toggleType(t)}
                        disabled={isGenerating}
                      />
                      <span>{t.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground space-y-1'>
              <p className='font-medium text-foreground'>How this works</p>
              {isNewQuiz ? (
                <p>
                  Nothing is saved yet. After generating, you'll see every
                  question and choose which to keep. Selected questions become a
                  new <strong>draft quiz</strong> — you'll land in the builder to
                  fine-tune and publish it when ready.
                </p>
              ) : (
                <p>
                  Nothing is saved yet. After generating, you'll see every
                  question and choose which to keep. Selected questions land in
                  your <strong>Question Bank</strong> for this course — you can
                  then drop them into any quiz via "Add from Bank".
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Phase 2: Preview / cherry-pick ──────────────────────────── */}
        {phase === 'preview' && (
          <div className='flex-1 flex flex-col gap-3 overflow-hidden'>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                className='gap-1 -ml-2'
                onClick={() => setPhase('config')}
                disabled={isSaving}
              >
                <ArrowLeft className='w-4 h-4' /> Back to prompt
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='ml-auto'
                onClick={toggleAll}
                disabled={isSaving}
              >
                {keepSet.size === generated.length
                  ? 'Deselect all'
                  : 'Select all'}
              </Button>
            </div>

            <div className='flex-1 overflow-y-auto pr-1 -mr-1 space-y-2'>
              {generated.map((q, idx) => (
                <PreviewRow
                  key={idx}
                  q={q}
                  checked={keepSet.has(idx)}
                  onToggle={() => toggleKeep(idx)}
                />
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant='outline' onClick={() => closeHandler(false)}>
            Cancel
          </Button>
          {phase === 'config' ? (
            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                isExtractingSource ||
                !prompt.trim() ||
                (isNewQuiz && !quizTitle.trim())
              }
              className='gap-1'
            >
              {isGenerating ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Drafting {count}…
                </>
              ) : (
                <>
                  <Wand2 className='w-4 h-4' />
                  Generate
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={isSaving || keepSet.size === 0}
              className='gap-1'
            >
              {isSaving
                ? isNewQuiz
                  ? 'Creating quiz…'
                  : 'Saving…'
                : isNewQuiz
                  ? `Create quiz with ${keepSet.size}`
                  : `Save ${keepSet.size} to bank`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/// Preview row — shows the question text + metadata badges + options (with
/// the correct one highlighted) so the teacher can spot bad rows at a
/// glance. Click anywhere on the row to toggle keep/skip.
function PreviewRow({
  q,
  checked,
  onToggle
}: {
  q: GeneratedQuestion;
  checked: boolean;
  onToggle: () => void;
}) {
  const correctCount = q.options.filter((o) => o.is_correct).length;
  return (
    <label
      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/[0.04]' : 'hover:bg-muted/30'
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className='mt-1' />
      <div className='min-w-0 flex-1 space-y-1.5'>
        <p className='text-sm font-medium'>{q.question_text}</p>

        <div className='flex items-center gap-1.5 flex-wrap'>
          <Badge variant='outline' className='text-[10px]'>
            {q.question_type.replace('_', ' ')}
          </Badge>
          <Badge variant='outline' className='text-[10px] tabular-nums'>
            {q.points} pt
          </Badge>
          <Badge variant='outline' className='text-[10px] capitalize'>
            {q.difficulty}
          </Badge>
          {q.topic && (
            <Badge variant='outline' className='text-[10px]'>
              {q.topic}
            </Badge>
          )}
          {/* Sanity-check badge for the teacher — a non-SHORT-ANSWER question
              with zero or multiple correct answers is almost certainly a bug
              in the model output. We surface it red so it's hard to miss. */}
          {q.question_type !== 'SHORT_ANSWER' && correctCount !== 1 && (
            <Badge variant='destructive' className='text-[10px] gap-1'>
              <XCircle className='w-3 h-3' />
              {correctCount === 0 ? 'no correct answer' : `${correctCount} correct`}
            </Badge>
          )}
        </div>

        {q.question_type !== 'SHORT_ANSWER' && q.options.length > 0 && (
          <ul className='space-y-0.5 text-xs pl-1'>
            {q.options.map((o, i) => (
              <li
                key={i}
                className={`flex items-start gap-1.5 ${
                  o.is_correct
                    ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {o.is_correct ? (
                  <CheckCircle2 className='w-3 h-3 mt-0.5 shrink-0' />
                ) : (
                  <span className='w-3 h-3 mt-0.5 shrink-0' aria-hidden />
                )}
                <span>{o.option_text}</span>
              </li>
            ))}
          </ul>
        )}

        {q.explanation && (
          <p className='text-[11px] text-muted-foreground italic'>
            <span className='font-medium not-italic'>Why:</span> {q.explanation}
          </p>
        )}
      </div>
    </label>
  );
}
