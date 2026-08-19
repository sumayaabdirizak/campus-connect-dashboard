'use client';

import { Switch } from '@/components/ui/switch';
import { Shuffle } from 'lucide-react';
import { DurationField } from './duration-field';
import type { FormState } from './form-state';

interface BehaviorTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
  /** Skips the Duration field — used when the page renders it elsewhere. */
  hideDuration?: boolean;
}

export function BehaviorTab({ form, setForm, hideDuration }: BehaviorTabProps) {
  const isOffline = form.mode === 'offline';

  return (
    <div className='space-y-3 mt-4'>
      {hideDuration ? null : <DurationField form={form} setForm={setForm} />}

      {isOffline ? (
        <p className='text-[11px] text-muted-foreground rounded-lg bg-muted/40 px-3 py-2.5'>
          Shuffle settings don&apos;t apply to offline quizzes — every printed copy shows
          questions and options in the same order.
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
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
      )}
    </div>
  );
}
