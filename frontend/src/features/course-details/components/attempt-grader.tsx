'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Keyboard,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useGradeAttempt } from '../api/quizzes-queries';
import type { GradedAnswerInput, QuizAttempt } from '../api/quizzes-types';

interface AttemptGraderProps {
  /// Attempt as returned by the attempts list (`include: { answers: { include:
  /// { question: true } } }`). Already includes everything the grader needs.
  attempt: QuizAttempt;
  /// Pass-through so we can invalidate the right list query after save.
  courseOfferingId: string;
  quizId: number;
  onBack: () => void;
}

/**
 * Teacher-side grading panel for a single attempt.
 *
 * What it does:
 *   - Renders every answer in submission order
 *   - Auto-graded rows (MCQ / True-False) are read-only and show the marker
 *     the system computed at submit time
 *   - Short-answer rows have an editable score input + Correct / Wrong /
 *     Partial quick buttons + a manual points field bounded by the question's
 *     max points
 *   - "Save grades" PATCHes only the rows the teacher touched (clean diff)
 *
 * Keyboard shortcuts (while the panel is mounted, ignoring inputs):
 *   - `j` / `↓`  — focus next short-answer row
 *   - `k` / `↑`  — focus previous
 *   - `c`        — mark current as fully correct (full points)
 *   - `w`        — mark current as fully wrong (0 points)
 *   - `Cmd+S`    — save
 *
 * We keep grading state purely local — `useGradeAttempt`'s onSuccess
 * invalidates the attempts list so the row updates after save.
 */
export function AttemptGrader({
  attempt,
  courseOfferingId,
  quizId,
  onBack,
}: AttemptGraderProps) {
  const gradeMutation = useGradeAttempt(courseOfferingId, quizId);

  // Pre-sort by question.order_index so the grader walks questions in the
  // canonical order — never the random order the answers happened to be
  // saved in.
  const answers = useMemo(
    () =>
      [...(attempt.answers ?? [])].sort(
        (a, b) => (a.question?.order_index ?? 0) - (b.question?.order_index ?? 0)
      ),
    [attempt.answers]
  );

  // Only short-answer rows need a grader UI; the others are read-only.
  const shortAnswerIndexes = useMemo(
    () =>
      answers
        .map((a, i) => (a.question?.question_type === 'SHORT_ANSWER' ? i : -1))
        .filter((i) => i >= 0),
    [answers]
  );

  /// Local edits indexed by answerId. Only rows the teacher actually touches
  /// get serialized into the save payload — keeps the diff clean.
  const [drafts, setDrafts] = useState<
    Record<number, { points_earned: number; is_correct: boolean }>
  >({});

  const [focusedRow, setFocusedRow] = useState<number>(
    shortAnswerIndexes[0] ?? 0
  );
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Scroll the focused row into view when it changes.
  useEffect(() => {
    const el = rowRefs.current[focusedRow];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedRow]);

  const setDraft = (
    answerId: number,
    patch: Partial<{ points_earned: number; is_correct: boolean }>
  ) => {
    setDrafts((d) => {
      const prev = d[answerId] ?? { points_earned: 0, is_correct: false };
      return { ...d, [answerId]: { ...prev, ...patch } };
    });
  };

  const stampFull = (idx: number) => {
    const a = answers[idx];
    if (!a?.question) return;
    setDraft(a.id, { points_earned: a.question.points, is_correct: true });
  };
  const stampWrong = (idx: number) => {
    const a = answers[idx];
    if (!a) return;
    setDraft(a.id, { points_earned: 0, is_correct: false });
  };

  // Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't fire shortcuts while typing into the manual points input.
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        if (!(e.metaKey || e.ctrlKey)) return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (shortAnswerIndexes.length === 0) return;
      const here = shortAnswerIndexes.indexOf(focusedRow);
      const wrapNext = (n: number) =>
        shortAnswerIndexes[(n + shortAnswerIndexes.length) % shortAnswerIndexes.length];
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRow(wrapNext(here + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRow(wrapNext(here - 1));
      } else if (e.key.toLowerCase() === 'c') {
        stampFull(focusedRow);
      } else if (e.key.toLowerCase() === 'w') {
        stampWrong(focusedRow);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedRow, drafts, answers, shortAnswerIndexes]);

  const handleSave = () => {
    const touched = Object.entries(drafts);
    if (touched.length === 0) {
      toast.info('No changes to save');
      return;
    }
    const payload: GradedAnswerInput[] = touched.map(([id, d]) => ({
      answerId: Number(id),
      points_earned: d.points_earned,
      is_correct: d.is_correct,
    }));
    gradeMutation.mutate(
      { attemptId: attempt.id, answers: payload },
      {
        onSuccess: () => {
          toast.success(`Saved ${touched.length} grade${touched.length === 1 ? '' : 's'}`);
          onBack();
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  // ── Header summary ──────────────────────────────────────────────────────
  const studentName = attempt.student?.full_name ?? `#${attempt.studentId}`;
  const totalPoints = answers.reduce((s, a) => s + (a.question?.points ?? 0), 0);
  // Computed live: existing earned + draft overrides.
  const earnedPoints = answers.reduce((s, a) => {
    const override = drafts[a.id]?.points_earned;
    return s + (override ?? a.points_earned ?? 0);
  }, 0);
  const liveScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  const ungradedCount = answers.filter(
    (a) => a.question?.question_type === 'SHORT_ANSWER' && a.is_correct == null && !drafts[a.id]
  ).length;

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back to attempts
      </Button>

      {/* Score banner — recomputes as the teacher types */}
      <div className='border rounded-xl p-4 flex items-center justify-between gap-3 bg-muted/30'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='font-bold truncate'>{studentName}</h2>
            {attempt.is_graded ? (
              <Badge variant='secondary' className='gap-1'>
                <Award className='w-3 h-3' /> Graded
              </Badge>
            ) : ungradedCount > 0 ? (
              <Badge variant='destructive' className='gap-1'>
                {ungradedCount} ungraded
              </Badge>
            ) : null}
          </div>
          <p className='text-xs text-muted-foreground'>
            {earnedPoints.toFixed(1)} / {totalPoints.toFixed(1)} pts
            {attempt.submitted_at && (
              <span> · submitted {format(new Date(attempt.submitted_at), 'MMM d, h:mm a')}</span>
            )}
          </p>
        </div>
        <div className='shrink-0 text-right'>
          <p className='text-2xl font-bold tabular-nums'>{Math.round(liveScore)}%</p>
        </div>
      </div>

      {/* Keyboard cheatsheet — collapsed-style hint */}
      {shortAnswerIndexes.length > 0 && (
        <div className='text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap'>
          <Keyboard className='w-3.5 h-3.5' />
          <kbd className='px-1 rounded border bg-muted'>j</kbd>/
          <kbd className='px-1 rounded border bg-muted'>k</kbd> next/prev ·
          <kbd className='px-1 rounded border bg-muted'>c</kbd> correct ·
          <kbd className='px-1 rounded border bg-muted'>w</kbd> wrong ·
          <kbd className='px-1 rounded border bg-muted'>⌘S</kbd> save
        </div>
      )}

      {/* Per-question rows */}
      <div className='space-y-3'>
        {answers.map((ans, i) => {
          const q = ans.question;
          if (!q) return null;
          const isShort = q.question_type === 'SHORT_ANSWER';
          const draft = drafts[ans.id];
          const effectivePoints = draft?.points_earned ?? ans.points_earned ?? 0;
          const effectiveCorrect = draft?.is_correct ?? ans.is_correct;
          const isFocused = i === focusedRow && isShort;

          return (
            <div
              key={ans.id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onClick={() => isShort && setFocusedRow(i)}
              className={`border rounded-lg p-4 space-y-3 ${
                isFocused ? 'ring-2 ring-primary/40 border-primary/40' : ''
              }`}
            >
              {/* Heading */}
              <div className='flex items-start justify-between gap-3'>
                <div className='flex items-start gap-2 min-w-0 flex-1'>
                  {effectiveCorrect === true ? (
                    <CheckCircle2 className='w-4 h-4 text-emerald-600 mt-0.5 shrink-0' />
                  ) : effectiveCorrect === false ? (
                    <XCircle className='w-4 h-4 text-destructive mt-0.5 shrink-0' />
                  ) : (
                    <span className='inline-block w-4 h-4 rounded-full border border-muted-foreground/40 mt-0.5 shrink-0' />
                  )}
                  <div className='min-w-0'>
                    <p className='font-medium'>
                      {i + 1}. {q.question_text}
                    </p>
                    <div className='flex gap-2 mt-1'>
                      <Badge variant='outline' className='text-[10px]'>
                        {q.question_type.replace('_', ' ')}
                      </Badge>
                      <Badge variant='outline' className='text-[10px]'>
                        max {q.points} pt
                      </Badge>
                    </div>
                  </div>
                </div>
                <Badge variant='outline' className='shrink-0 tabular-nums'>
                  {effectivePoints.toFixed(1)} / {q.points} pt
                </Badge>
              </div>

              {/* Answer body */}
              {isShort ? (
                <div className='space-y-2 pl-6'>
                  <div className='border rounded p-2 text-sm bg-muted/30 whitespace-pre-wrap min-h-[2.5rem]'>
                    {ans.text_answer?.trim() || (
                      <span className='italic text-muted-foreground'>— no answer —</span>
                    )}
                  </div>

                  {/* Grading controls */}
                  <div className='flex items-center gap-2 flex-wrap'>
                    <Button
                      type='button'
                      variant={effectiveCorrect === true ? 'default' : 'outline'}
                      size='sm'
                      className='gap-1'
                      onClick={() => stampFull(i)}
                    >
                      <CheckCircle2 className='w-3.5 h-3.5' />
                      Correct ({q.points})
                    </Button>
                    <Button
                      type='button'
                      variant={effectiveCorrect === false && effectivePoints === 0 ? 'default' : 'outline'}
                      size='sm'
                      className='gap-1'
                      onClick={() => stampWrong(i)}
                    >
                      <XCircle className='w-3.5 h-3.5' />
                      Wrong (0)
                    </Button>
                    <div className='flex items-center gap-1.5 ml-auto'>
                      <span className='text-[11px] text-muted-foreground'>Custom:</span>
                      <Input
                        type='number'
                        min={0}
                        max={q.points}
                        step={0.5}
                        value={effectivePoints}
                        onChange={(e) => {
                          const v = Math.min(
                            q.points,
                            Math.max(0, Number(e.target.value) || 0)
                          );
                          setDraft(ans.id, {
                            points_earned: v,
                            // Treat any partial > 0 as correct so the icon
                            // colors right. Teacher can override via the
                            // Wrong button to force is_correct=false at 0.
                            is_correct: v >= q.points,
                          });
                        }}
                        className='h-7 w-20 text-sm tabular-nums'
                      />
                      <span className='text-[11px] text-muted-foreground'>/ {q.points}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Auto-graded: read-only summary */
                <div className='pl-6 text-[11px] text-muted-foreground'>
                  {effectiveCorrect === true
                    ? 'Auto-graded as correct.'
                    : effectiveCorrect === false
                      ? 'Auto-graded as incorrect.'
                      : 'Not auto-graded.'}
                </div>
              )}
            </div>
          );
        })}

        {answers.length === 0 && (
          <div className='border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground'>
            This attempt has no answers — likely auto-submitted with everything blank.
          </div>
        )}
      </div>

      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={onBack}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={gradeMutation.isPending || Object.keys(drafts).length === 0}
          className='gap-1'
        >
          {gradeMutation.isPending
            ? 'Saving…'
            : `Save ${Object.keys(drafts).length} grade${Object.keys(drafts).length === 1 ? '' : 's'}`}
          <ArrowRight className='w-4 h-4' />
        </Button>
      </div>
    </div>
  );
}
