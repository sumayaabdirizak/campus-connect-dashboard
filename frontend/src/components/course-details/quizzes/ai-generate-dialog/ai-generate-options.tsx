'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import {
  QUESTION_TYPE_LABELS,
  questionTypesForMode,
  type QuizDeliveryMode
} from '../quiz-question-types';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass
} from '../new-quiz-page/field-styles';

interface AiGenerateOptionsProps {
  count: number;
  setCount: (v: number) => void;
  questionTypes: QuizQuestionType[];
  toggleType: (t: QuizQuestionType) => void;
  disabled: boolean;
  /// When set, the Question-types picker is replaced by a one-line summary
  /// — used when the quiz already has a marks plan, so asking again here
  /// would just duplicate config the teacher already set.
  lockedTypes?: QuizQuestionType[];
  minimal?: boolean;
  quizMode?: QuizDeliveryMode;
}

export function AiGenerateOptions({
  count,
  setCount,
  questionTypes,
  toggleType,
  disabled,
  lockedTypes,
  minimal,
  quizMode = 'online'
}: AiGenerateOptionsProps) {
  const availableTypes = questionTypesForMode(quizMode);

  return (
    <div className={`flex flex-wrap items-start gap-4 ${minimal ? 'gap-3' : ''}`}>
      <div className='w-24 space-y-1.5'>
        <Label htmlFor='ai-count' className={quizFormLabelClass}>
          How many
        </Label>
        <Input
          id='ai-count'
          type='number'
          min={1}
          max={25}
          value={count}
          onChange={(e) => setCount(Math.min(25, Math.max(1, Number(e.target.value) || 1)))}
          disabled={disabled}
          className={quizFormFieldClass}
        />
      </div>

      <div className='min-w-[220px] flex-1 space-y-1.5'>
        <Label className={quizFormLabelClass}>
          {lockedTypes ? 'Types' : 'Types to include'}
        </Label>
        {lockedTypes ? (
          <p className={quizFormHintClass}>
            <strong className='font-medium text-primary'>
              {lockedTypes.map((t) => QUESTION_TYPE_LABELS[t]).join(', ')}
            </strong>{' '}
            — matching this quiz’s marking plan.
          </p>
        ) : (
          <div className='flex flex-wrap gap-2'>
            {availableTypes.map((t) => {
              const active = questionTypes.includes(t);
              return (
                <button
                  key={t}
                  type='button'
                  disabled={disabled}
                  onClick={() => toggleType(t)}
                  aria-pressed={active}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(59,130,246,0.28)]'
                      : 'border-border/90 bg-card text-foreground hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  {QUESTION_TYPE_LABELS[t]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
