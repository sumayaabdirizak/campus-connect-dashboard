'use client';

import { Checkbox } from '@/components/ui/checkbox';
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
  return (
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
      <div className='space-y-1.5'>
        <Label>Types</Label>
        <div className='flex flex-col gap-1 text-xs'>
          {(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map((t) => (
            <label key={t} className='inline-flex items-center gap-1.5 cursor-pointer'>
              <Checkbox
                checked={questionTypes.includes(t)}
                onCheckedChange={() => toggleType(t)}
                disabled={disabled}
              />
              <span>{t.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
