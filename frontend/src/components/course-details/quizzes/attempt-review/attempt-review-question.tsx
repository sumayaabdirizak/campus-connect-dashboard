'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, CheckCircle2, Circle, Lightbulb, X, XCircle } from 'lucide-react';
import type { QuizAttempt, QuizQuestion } from '@/lib/course-details/services/quizzes-types';

type AttemptReviewAnswer = NonNullable<QuizAttempt['answers']>[number];

interface AttemptReviewQuestionProps {
  question: QuizQuestion;
  index: number;
  answer?: AttemptReviewAnswer;
  /** When false, hide which options are correct (cohort window still live). */
  answersRevealed?: boolean;
}

function typeLabel(type: QuizQuestion['question_type']) {
  if (type === 'TRUE_FALSE') return 'True / False';
  if (type === 'SHORT_ANSWER') return 'Written';
  return 'Multiple choice';
}

export function AttemptReviewQuestion({
  question: q,
  index,
  answer: ans,
  answersRevealed = true
}: AttemptReviewQuestionProps) {
  const earned = ans?.points_earned ?? 0;
  const selectedId = ans?.selected_option_id ?? null;
  const wasAnswered =
    selectedId != null ||
    (ans?.text_answer != null && ans.text_answer.trim() !== '');
  const isCorrect = ans?.is_correct === true;
  const isWrong = wasAnswered && ans?.is_correct === false;
  const isShort = q.question_type === 'SHORT_ANSWER';
  const options = q.options ?? [];
  const showKey = answersRevealed;

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border bg-card p-4',
        isCorrect
          ? 'border-success/40'
          : isWrong
            ? 'border-destructive/30'
            : 'border-border'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-1 items-start gap-2'>
          {isCorrect ? (
            <CheckCircle2 className='mt-0.5 size-4 shrink-0 text-success' />
          ) : isWrong ? (
            <XCircle className='mt-0.5 size-4 shrink-0 text-destructive' />
          ) : (
            <Circle className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
          )}
          <div className='min-w-0'>
            <p className='font-medium text-foreground'>
              {index + 1}. {q.question_text}
            </p>
            <div className='mt-1.5 flex flex-wrap items-center gap-2'>
              <Badge variant='outline' size='sm' className='rounded-full text-xs'>
                {typeLabel(q.question_type)}
              </Badge>
              <span
                className={cn(
                  'text-xs font-medium',
                  isCorrect
                    ? 'text-success'
                    : isWrong
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {isCorrect
                  ? 'Correct'
                  : isWrong
                    ? 'Incorrect'
                    : wasAnswered
                      ? 'Waiting for a grade'
                      : 'Skipped'}
              </span>
            </div>
          </div>
        </div>
        <Badge variant='outline' size='sm' className='shrink-0 rounded-full tabular-nums'>
          {ans?.is_correct == null && !isShort ? '—' : earned.toFixed(1)} / {q.points}{' '}
          pt
        </Badge>
      </div>

      {isShort ? (
        <div className='space-y-2 pl-6'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Your answer
          </p>
          <div className='select-text whitespace-pre-wrap rounded-xl border bg-muted/30 p-3 text-sm'>
            {ans?.text_answer?.trim() || (
              <span className='italic text-muted-foreground'>— no answer —</span>
            )}
          </div>
          {ans?.is_correct == null ? (
            <p className='text-[11px] text-muted-foreground'>Pending teacher review.</p>
          ) : (
            <p className='text-[11px] text-muted-foreground'>
              {isCorrect ? 'Marked as correct.' : 'Marked as incorrect.'}
            </p>
          )}
        </div>
      ) : options.length > 0 ? (
        <ul className='space-y-2 pl-6' role='list'>
          {options.map((opt) => {
            const isSelected = selectedId === opt.id;
            const isKeyCorrect = opt.is_correct === true;
            const revealCorrect = showKey && isKeyCorrect;
            const revealWrongPick = showKey && isSelected && !isKeyCorrect;

            return (
              <li
                key={opt.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm',
                  revealCorrect
                    ? 'border-success/50 bg-success/10 text-foreground'
                    : revealWrongPick
                      ? 'border-destructive/40 bg-destructive/5 text-foreground'
                      : isSelected && !showKey
                        ? 'border-info/40 bg-info/10 text-foreground'
                        : 'border-border/80 bg-muted/20 text-muted-foreground'
                )}
              >
                <span className='mt-0.5 grid size-5 shrink-0 place-items-center'>
                  {revealCorrect ? (
                    <Check className='size-4 text-success' aria-hidden />
                  ) : revealWrongPick ? (
                    <X className='size-4 text-destructive' aria-hidden />
                  ) : isSelected ? (
                    <Circle className='size-3.5 fill-current text-info' aria-hidden />
                  ) : (
                    <Circle className='size-3.5 text-muted-foreground/50' aria-hidden />
                  )}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='leading-snug'>{opt.option_text}</p>
                  <div className='mt-1 flex flex-wrap gap-1.5'>
                    {isSelected ? (
                      <Badge
                        size='xs'
                        className={cn(
                          'rounded-full',
                          revealWrongPick
                            ? 'border-transparent bg-destructive text-white'
                            : revealCorrect
                              ? 'border-transparent bg-success text-success-foreground'
                              : 'border-transparent bg-info text-info-foreground'
                        )}
                      >
                        Your answer
                      </Badge>
                    ) : null}
                    {revealCorrect ? (
                      <Badge
                        size='xs'
                        className='rounded-full border-transparent bg-success text-success-foreground'
                      >
                        Correct answer
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className='pl-6 text-sm text-muted-foreground'>
          {isCorrect
            ? 'Correct'
            : isWrong
              ? 'Incorrect'
              : wasAnswered
                ? 'Waiting for a grade'
                : 'Skipped'}
        </p>
      )}

      {showKey && q.explanation ? (
        <div className='ml-6 flex gap-2 rounded-xl border border-warning bg-warning-muted p-3'>
          <Lightbulb className='mt-0.5 size-4 shrink-0 text-warning' />
          <div>
            <p className='mb-1 text-[11px] font-medium uppercase tracking-wide text-warning-foreground'>
              Why?
            </p>
            <p className='select-text whitespace-pre-wrap text-xs text-warning-foreground'>
              {q.explanation}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
