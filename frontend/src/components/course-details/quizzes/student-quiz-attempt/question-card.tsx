'use client';

import { Textarea } from '@/components/ui/textarea';
import type { QuizAttemptAnswer, QuizStartResponse } from '@/lib/course-details/services/quizzes-types';
import { ConfidencePicker } from './confidence-picker';
import { cn } from '@/lib/utils';

type Question = QuizStartResponse['questions'][number];

export function QuestionCard({
  question: q,
  answer: a,
  watermarkLabel,
  previewMode,
  confidenceScoring,
  onUpdate
}: {
  question: Question;
  answer?: QuizAttemptAnswer;
  watermarkLabel: string;
  previewMode: boolean;
  confidenceScoring: boolean;
  onUpdate: (questionId: number, patch: Partial<QuizAttemptAnswer>) => void;
}) {
  return (
    <div
      className='relative overflow-hidden rounded-xl border border-border/80 bg-card p-6 sm:p-8'
      style={{ viewTransitionName: 'quiz-question-card' }}
    >
      {!previewMode ? (
        <div className='pointer-events-none absolute inset-0 select-none overflow-hidden' aria-hidden>
          {[0, 1].map((row) =>
            [0, 1].map((col) => (
              <span
                key={`${row}-${col}`}
                className='absolute whitespace-nowrap text-[10px] font-medium text-foreground/[0.05]'
                style={{
                  transform: 'rotate(-18deg)',
                  top: `${row * 48 + 18}%`,
                  left: `${col * 50 - 4}%`
                }}
              >
                {watermarkLabel}
              </span>
            ))
          )}
        </div>
      ) : null}

      <p className='text-xl font-semibold leading-snug text-foreground sm:text-2xl'>
        {q.question_text}
      </p>
      <p className='mt-2 text-sm text-muted-foreground'>{q.points} {q.points === 1 ? 'point' : 'points'}</p>

      {q.question_type === 'SHORT_ANSWER' ? (
        <Textarea
          rows={5}
          placeholder='Type your answer here…'
          value={a?.text_answer ?? ''}
          onChange={(e) =>
            onUpdate(q.id, { text_answer: e.target.value, selected_option_id: null })
          }
          className='mt-6 min-h-[8rem] rounded-xl bg-background text-base'
        />
      ) : (
        <div className='mt-6 space-y-3'>
          {q.options.map((o, i) => {
            const isSelected = a?.selected_option_id === o.id;
            const letter = String.fromCharCode(65 + i);
            return (
              <label
                key={o.id}
                className={cn(
                  'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-base transition-colors',
                  isSelected
                    ? 'border-blue-600 bg-blue-50 font-medium text-foreground'
                    : 'border-border bg-background hover:bg-muted/50'
                )}
              >
                <input
                  type='radio'
                  name={`q-${q.id}`}
                  checked={isSelected}
                  onChange={() =>
                    onUpdate(q.id, { selected_option_id: o.id, text_answer: null })
                  }
                  className='sr-only'
                />
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {letter}
                </span>
                <span>{o.option_text}</span>
              </label>
            );
          })}
        </div>
      )}

      {confidenceScoring && q.question_type !== 'SHORT_ANSWER' ? (
        <div className='mt-6'>
          <ConfidencePicker
            value={(a?.confidence as 'LOW' | 'MED' | 'HIGH' | undefined) ?? 'MED'}
            onChange={(v) => onUpdate(q.id, { confidence: v })}
          />
        </div>
      ) : null}
    </div>
  );
}
