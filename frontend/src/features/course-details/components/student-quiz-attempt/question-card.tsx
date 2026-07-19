'use client';

import { Textarea } from '@/components/ui/textarea';
import type { QuizAttemptAnswer, QuizStartResponse } from '../../api/quizzes-types';
import { ConfidencePicker } from './confidence-picker';

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
      className='relative overflow-hidden rounded-xl bg-muted/40 p-6 space-y-5'
      style={{ viewTransitionName: 'quiz-question-card' }}
    >
      {!previewMode ? (
        <div
          className='absolute inset-0 pointer-events-none select-none overflow-hidden rounded-xl'
          aria-hidden
        >
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2].map((col) => (
              <span
                key={`${row}-${col}`}
                className='absolute text-[9px] font-medium text-foreground/[0.07] whitespace-nowrap'
                style={{
                  transform: 'rotate(-22deg)',
                  top: `${row * 30 + 10}%`,
                  left: `${col * 38 - 8}%`
                }}
              >
                {watermarkLabel}
              </span>
            ))
          )}
        </div>
      ) : null}

      <div className='flex items-start gap-3'>
        <span className='shrink-0 mt-0.5 text-xs font-semibold bg-muted text-muted-foreground rounded-md px-2 py-1 tabular-nums'>
          {q.points} pts
        </span>
        <p className='font-bold text-base leading-snug select-none'>{q.question_text}</p>
      </div>

      {q.question_type === 'SHORT_ANSWER' ? (
        <Textarea
          rows={4}
          placeholder='Type your answer…'
          value={a?.text_answer ?? ''}
          onChange={(e) =>
            onUpdate(q.id, { text_answer: e.target.value, selected_option_id: null })
          }
          className='bg-background'
        />
      ) : (
        <div className='space-y-2'>
          {q.options.map((o) => {
            const isSelected = a?.selected_option_id === o.id;
            return (
              <label
                key={o.id}
                className={`flex items-center p-4 rounded-lg border bg-background cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-border hover:bg-muted/60'
                }`}
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
                <span className='text-sm'>{o.option_text}</span>
              </label>
            );
          })}
        </div>
      )}

      {confidenceScoring && q.question_type !== 'SHORT_ANSWER' ? (
        <ConfidencePicker
          value={(a?.confidence as 'LOW' | 'MED' | 'HIGH' | undefined) ?? 'MED'}
          onChange={(v) => onUpdate(q.id, { confidence: v })}
        />
      ) : null}
    </div>
  );
}
