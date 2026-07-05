'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Lightbulb, Award, ArrowLeft, Clock3, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import type { QuizAttempt, QuizQuestion } from '../api/quizzes-types';

interface AttemptReviewProps {
  /// The attempt returned by the submit endpoint — must include `quiz.questions`
  /// (with options) and `answers`. Submit response and the auto-submit cron's
  /// finalized rows both satisfy this shape.
  attempt: QuizAttempt;
  onBack: () => void;
}

/**
 * Post-submit review screen for a student.
 *
 * Layout (top → bottom):
 *   1. Big score banner — total score, pass/fail badge, points earned, time
 *      taken, closure reason if any (time expired / violations).
 *   2. Per-question breakdown — for each question:
 *        ✓ / ✗ on the heading row + points earned
 *        the question text + the student's answer
 *        the correct answer(s) highlighted
 *        optional teacher explanation in a soft tinted card
 *
 * We deliberately reveal correct answers immediately on submit — same
 * pattern as Canvas / Duolingo / Khan Academy. A future "Delay correct
 * answer reveal until close" setting would gate that.
 */
export function AttemptReview({ attempt, onBack }: AttemptReviewProps) {
  const quiz = attempt.quiz;
  const questions: QuizQuestion[] = quiz?.questions ?? [];
  const answersByQuestion = new Map(
    (attempt.answers ?? []).map((a) => [a.questionId, a])
  );

  const score = attempt.score ?? 0;
  const passingScore = quiz?.passing_score ?? 50;
  const passed = score >= passingScore;

  // Total points = sum of question points; earned = sum of answer.points_earned.
  const totalPoints = questions.reduce((s, q) => s + q.points, 0);
  const earnedPoints = (attempt.answers ?? []).reduce(
    (s, a) => s + (a.points_earned ?? 0),
    0
  );

  const closureReason = attempt.closure_reason ?? null;
  const violationsCount = attempt.violations_count ?? 0;
  const closureBadge = (() => {
    if (!closureReason) return null;
    if (closureReason === 'time_expired')
      return { label: 'Auto-submitted on time-out', tone: 'destructive' as const };
    if (closureReason === 'violations')
      return { label: 'Closed for violations', tone: 'destructive' as const };
    return { label: closureReason, tone: 'secondary' as const };
  })();
  // Human-readable callout body for the auto-close banner. Mirrors the
  // language the in-quiz warning modal uses so the student sees consistent
  // wording across the flow.
  const closureCallout = (() => {
    if (closureReason === 'violations') {
      return 'Your quiz was auto-submitted after you reached the warning limit. Your answers up to that point were saved and graded.';
    }
    if (closureReason === 'time_expired') {
      return 'Time ran out — your quiz was submitted automatically with the answers you had saved.';
    }
    return null;
  })();

  const submittedAt = attempt.submitted_at
    ? new Date(attempt.submitted_at)
    : null;
  const startedAt = attempt.started_at ? new Date(attempt.started_at) : null;
  const elapsedMs =
    submittedAt && startedAt ? submittedAt.getTime() - startedAt.getTime() : null;
  const elapsedLabel = (() => {
    if (elapsedMs == null) return null;
    const totalSec = Math.floor(elapsedMs / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  })();

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back to quizzes
      </Button>

      {/* ── Score banner ───────────────────────────────────────────────── */}
      <div
        className={`border rounded-xl p-5 flex items-center justify-between gap-4 ${
          passed
            ? 'border-success bg-success-muted'
            : 'border-destructive/40 bg-destructive/5'
        }`}
      >
        <div className='space-y-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h2 className='text-lg font-bold truncate'>{quiz?.title ?? 'Quiz'}</h2>
            <Badge variant={passed ? 'default' : 'destructive'} className='gap-1'>
              <Award className='w-3 h-3' />
              {passed ? 'Passed' : 'Did not pass'}
            </Badge>
            {closureBadge && (
              <Badge variant={closureBadge.tone}>{closureBadge.label}</Badge>
            )}
          </div>
          <p className='text-xs text-muted-foreground'>
            {earnedPoints.toFixed(1)} / {totalPoints.toFixed(1)} points · passing
            mark {passingScore}%
            {submittedAt && (
              <span> · submitted {format(submittedAt, 'MMM d, h:mm a')}</span>
            )}
            {elapsedLabel && (
              <span className='inline-flex items-center gap-0.5 ml-1'>
                <Clock3 className='w-3 h-3' /> {elapsedLabel}
              </span>
            )}
            {/* Surface the violations counter inline so the student (and the
                teacher reviewing alongside them) sees the monitoring outcome
                at a glance. Only renders when non-zero — a clean attempt
                doesn't need a "0 violations" badge cluttering the line. */}
            {violationsCount > 0 && (
              <span
                className='inline-flex items-center gap-0.5 ml-1 text-destructive'
                title={`${violationsCount} monitoring event${violationsCount === 1 ? '' : 's'} during this attempt`}
              >
                · <ShieldAlert className='w-3 h-3' /> {violationsCount} violation{violationsCount === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>
        <div className='text-right shrink-0'>
          <p
            className={`text-4xl font-bold tabular-nums ${
              passed
                ? 'text-success'
                : 'text-destructive'
            }`}
          >
            {Math.round(score)}%
          </p>
        </div>
      </div>

      {/* Auto-close callout — only renders when the attempt was force-closed
          (by the violations limit or the timer). Gives the student a clear
          explanation instead of leaving them to interpret the closure badge
          alone. Mirrors the design's "Auto-Closed Session" card. */}
      {closureCallout && (
        <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3'>
          <ShieldAlert className='w-5 h-5 text-destructive shrink-0 mt-0.5' />
          <div className='space-y-0.5'>
            <p className='text-sm font-medium text-destructive'>
              {closureReason === 'violations' ? 'Session auto-closed' : 'Time expired'}
            </p>
            <p className='text-xs text-destructive/90'>{closureCallout}</p>
          </div>
        </div>
      )}

      {/* ── Per-question breakdown ────────────────────────────────────── */}
      <div className='space-y-3'>
        {questions.map((q, i) => {
          const ans = answersByQuestion.get(q.id);
          const earned = ans?.points_earned ?? 0;
          const wasAnswered =
            (ans?.selected_option_id ?? null) !== null ||
            (ans?.text_answer != null && ans.text_answer.trim() !== '');
          const isCorrect = ans?.is_correct === true;
          const isWrong = wasAnswered && !isCorrect;
          const isSkipped = !wasAnswered;

          return (
            <div
              key={q.id}
              className={`border rounded-lg p-4 space-y-3 ${
                isCorrect
                  ? 'border-success'
                  : isWrong
                    ? 'border-destructive/30'
                    : 'border-muted-foreground/20'
              }`}
            >
              {/* Heading row */}
              <div className='flex items-start justify-between gap-3'>
                <div className='flex items-start gap-2 min-w-0 flex-1'>
                  {isCorrect ? (
                    <CheckCircle2 className='w-4 h-4 text-success mt-0.5 shrink-0' />
                  ) : (
                    <XCircle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSkipped ? 'text-muted-foreground' : 'text-destructive'
                      }`}
                    />
                  )}
                  <div className='min-w-0'>
                    <p className='font-medium'>
                      {i + 1}. {q.question_text}
                    </p>
                  </div>
                </div>
                <Badge variant='outline' className='shrink-0 tabular-nums'>
                  {earned.toFixed(1)} / {q.points} pt
                </Badge>
              </div>

              {/* SHORT_ANSWER: show what they typed + a "pending review" note */}
              {q.question_type === 'SHORT_ANSWER' ? (
                <div className='space-y-2 pl-6'>
                  <div className='select-text border rounded p-2 text-sm bg-muted/30 whitespace-pre-wrap'>
                    {ans?.text_answer?.trim() || (
                      <span className='italic text-muted-foreground'>
                        — no answer —
                      </span>
                    )}
                  </div>
                  {ans?.is_correct == null && (
                    <p className='text-[11px] text-muted-foreground'>
                      Pending teacher review.
                    </p>
                  )}
                </div>
              ) : (
                /* MCQ / TRUE_FALSE: list options with markers */
                <ul className='space-y-1.5 pl-6'>
                  {q.options.map((o) => {
                    const isSelected = ans?.selected_option_id === o.id;
                    const isAnswerKey = !!o.is_correct;
                    return (
                      <li
                        key={o.id}
                        className={`flex items-start gap-2 text-sm rounded p-1.5 ${
                          isAnswerKey
                            ? 'bg-success-muted'
                            : isSelected
                              ? 'bg-destructive/5'
                              : ''
                        }`}
                      >
                        <span className='mt-0.5 shrink-0'>
                          {isAnswerKey ? (
                            <CheckCircle2 className='w-3.5 h-3.5 text-success' />
                          ) : isSelected ? (
                            <XCircle className='w-3.5 h-3.5 text-destructive' />
                          ) : (
                            <span className='inline-block w-3.5 h-3.5 rounded-full border border-muted-foreground/30' />
                          )}
                        </span>
                        <span className='flex-1'>{o.option_text}</span>
                        {isSelected && (
                          <Badge
                            variant='outline'
                            className='text-[9px] shrink-0 self-center'
                          >
                            Your answer
                          </Badge>
                        )}
                        {isAnswerKey && !isSelected && (
                          <Badge
                            variant='outline'
                            className='text-[9px] shrink-0 self-center text-success'
                          >
                            Correct
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Teacher explanation — only render if set */}
              {q.explanation && (
                <div className='ml-6 rounded-md border border-warning bg-warning-muted p-3 flex gap-2'>
                  <Lightbulb className='w-4 h-4 text-warning shrink-0 mt-0.5' />
                  <div>
                    <p className='text-[11px] font-medium text-warning-foreground uppercase tracking-wide mb-1'>
                      Why?
                    </p>
                    <p className='select-text text-xs text-warning-foreground whitespace-pre-wrap'>
                      {q.explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className='flex justify-end pt-2'>
        <Button onClick={onBack}>Done</Button>
      </div>
    </div>
  );
}
