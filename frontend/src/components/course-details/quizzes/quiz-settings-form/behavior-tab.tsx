'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Shuffle } from 'lucide-react';
import type { FormState } from './form-state';

interface BehaviorTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
}

export function BehaviorTab({ form, setForm }: BehaviorTabProps) {
  return (
    <div className='space-y-3 mt-4'>
      <div className='space-y-1.5'>
        <Label htmlFor='quiz-dur' className='flex items-center gap-1'>
          <Clock className='w-3.5 h-3.5' /> Duration (min)
        </Label>
        <Input
          id='quiz-dur'
          type='number'
          min={1}
          max={480}
          value={form.duration_minutes}
          onChange={(e) =>
            setForm({
              ...form,
              duration_minutes: Math.max(1, Number(e.target.value) || 1)
            })
          }
        />
        <p className='text-[11px] text-muted-foreground'>
          {form.timing_mode === 'flexible'
            ? 'Each student gets this many minutes once they start the quiz.'
            : 'Fallback time limit in fixed mode when no Scheduled duration is set on the Schedule tab.'}
        </p>
      </div>

      <div className='flex items-center justify-between rounded-md border p-3'>
        <div className='space-y-0.5'>
          <p className='text-sm font-medium flex items-center gap-1.5'>
            <Shuffle className='w-3.5 h-3.5' /> Shuffle questions
          </p>
          <p className='text-[11px] text-muted-foreground'>
            Reorder questions independently per attempt — discourages copying.
          </p>
        </div>
        <Switch
          checked={form.shuffle_questions}
          onCheckedChange={(v) => setForm({ ...form, shuffle_questions: v })}
        />
      </div>

      <div className='flex items-center justify-between rounded-md border p-3'>
        <div className='space-y-0.5'>
          <p className='text-sm font-medium flex items-center gap-1.5'>
            <Shuffle className='w-3.5 h-3.5' /> Shuffle answer choices
          </p>
          <p className='text-[11px] text-muted-foreground'>
            Re-order options on MCQ / True-False per attempt.
          </p>
        </div>
        <Switch
          checked={form.shuffle_answers}
          onCheckedChange={(v) => setForm({ ...form, shuffle_answers: v })}
        />
      </div>
    </div>
  );
}
