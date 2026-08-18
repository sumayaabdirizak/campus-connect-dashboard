'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { QuizQuestionType } from '@/lib/course-details/services/quizzes-types';
import type { Difficulty } from './types';

interface AiGenerateOptionsProps {
  count: number;
  setCount: (v: number) => void;
  difficulty: Difficulty;
  setDifficulty: (v: Difficulty) => void;
  questionTypes: QuizQuestionType[];
  toggleType: (t: QuizQuestionType) => void;
  disabled: boolean;
}

export function AiGenerateOptions({
  count,
  setCount,
  difficulty,
  setDifficulty,
  questionTypes,
  toggleType,
  disabled
}: AiGenerateOptionsProps) {
  const TYPE_LABEL: Record<QuizQuestionType, string> = {
    MCQ: 'Multiple choice',
    TRUE_FALSE: 'True / False',
    SHORT_ANSWER: 'Short answer'
  };

  return (
    <div className='grid grid-cols-2 gap-3'>
      <div className='space-y-1.5'>
        <Label htmlFor='ai-count'>Number of questions</Label>
        <Input
          id='ai-count'
          type='number'
          min={1}
          max={25}
          value={count}
          onChange={(e) =>
            setCount(Math.min(25, Math.max(1, Number(e.target.value) || 1)))
          }
          disabled={disabled}
        />
      </div>
      <div className='space-y-1.5'>
        <Label>Difficulty</Label>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v as Difficulty)}
          disabled={disabled}
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
      <div className='col-span-2 space-y-1.5'>
        <Label>Question types</Label>
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
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
