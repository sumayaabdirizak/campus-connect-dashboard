'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';

const TYPE_LABEL: Record<QuizQuestionType, string> = {
  MCQ: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer'
};

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
}

export function AiGenerateOptions({
  count,
  setCount,
  questionTypes,
  toggleType,
  disabled,
  lockedTypes
}: AiGenerateOptionsProps) {
  return (
    <div className='flex flex-wrap items-start gap-4'>
      <div className='w-20 space-y-1.5'>
        <Label htmlFor='ai-count' className='text-xs text-muted-foreground'>
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
          className='h-9'
        />
      </div>

      <div className='flex-1 min-w-[220px] space-y-1.5'>
        <Label className='text-xs text-muted-foreground'>
          {lockedTypes ? 'Types' : 'Types to include'}
        </Label>
        {lockedTypes ? (
          <p className='text-xs text-muted-foreground leading-relaxed'>
            <strong className='text-primary'>
              {lockedTypes.map((t) => TYPE_LABEL[t]).join(', ')}
            </strong>{' '}
            — locked to this quiz&apos;s marks plan.
          </p>
        ) : (
          <div className='flex flex-wrap gap-2'>
            {(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map((t) => {
              const active = questionTypes.includes(t);
              return (
                <button
                  key={t}
                  type='button'
                  disabled={disabled}
                  onClick={() => toggleType(t)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary/25 text-muted-foreground hover:border-primary/50 hover:text-primary'
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
