'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass
} from '../new-quiz-page/field-styles';
import type { FormState } from './form-state';

export function DurationField({
  form,
  setForm,
  fullWidth
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  /** Stretches the input to the column width (e.g. when paired beside timer mode). */
  fullWidth?: boolean;
}) {
  return (
    <div className='space-y-1.5'>
        <Label htmlFor='quiz-dur' className={quizFormLabelClass}>
          Time limit (minutes)
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
              duration_minutes: Math.min(480, Math.max(1, Number(e.target.value) || 1))
            })
          }
          className={`${quizFormFieldClass} ${fullWidth ? 'w-full' : 'max-w-[10rem]'}`}
        />
      <p className={quizFormHintClass}>
        {form.mode === 'offline'
          ? 'Nothing is timed on paper — announce this as the time limit when you hand the quiz out.'
          : form.timing_mode === 'flexible'
            ? 'Each student gets this many minutes once they start the quiz.'
            : 'Everyone\'s timer runs for this many minutes, starting at "Available from".'}
      </p>
    </div>
  );
}
