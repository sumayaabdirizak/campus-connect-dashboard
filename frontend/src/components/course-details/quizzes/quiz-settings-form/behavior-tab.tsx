'use client';

import { Switch } from '@/components/ui/switch';
import { Shuffle } from 'lucide-react';
import {
  quizFormHintClass,
  quizFormRowClass,
  quizFormSwitchClass
} from '../new-quiz-page/field-styles';
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
        <p className={`${quizFormHintClass} rounded-xl border border-border bg-muted px-3.5 py-2.5`}>
          Mixing up the order isn&apos;t possible on paper — every printed copy comes out the same.
        </p>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          <div className={`flex items-center justify-between ${quizFormRowClass}`}>
            <div className='space-y-0.5'>
              <p className='flex items-center gap-1.5 text-sm font-medium'>
                <Shuffle className='size-3.5' /> Mix up the question order
              </p>
         
            </div>
            <Switch
              checked={form.shuffle_questions}
              onCheckedChange={(v) => setForm({ ...form, shuffle_questions: v })}
              className={quizFormSwitchClass}
            />
          </div>

          <div className={`flex items-center justify-between ${quizFormRowClass}`}>
            <div className='space-y-0.5'>
              <p className='flex items-center gap-1.5 text-sm font-medium'>
                <Shuffle className='size-3.5' /> Mix up the answer order
              </p>
            
            </div>
            <Switch
              checked={form.shuffle_answers}
              onCheckedChange={(v) => setForm({ ...form, shuffle_answers: v })}
              className={quizFormSwitchClass}
            />
          </div>
        </div>
      )}
    </div>
  );
}
