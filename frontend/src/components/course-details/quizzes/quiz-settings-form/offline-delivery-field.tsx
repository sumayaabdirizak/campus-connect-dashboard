'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { quizFormHintClass, quizFormLabelClass } from '../new-quiz-page/field-styles';
import type { FormState } from './form-state';

export function OfflineDeliveryField({
  form,
  setForm
}: {
  form: FormState;
  setForm: (next: FormState) => void;
}) {
  if (form.mode !== 'offline') return null;

  return (
    <div className='space-y-2'>
      <Label className={quizFormLabelClass}>How is this quiz provided?</Label>
      <RadioGroup
        value={form.offline_delivery}
        onValueChange={(v) =>
          setForm({
            ...form,
            offline_delivery: v as FormState['offline_delivery']
          })
        }
        className='grid gap-2 sm:grid-cols-2'
      >
        <label
          className='flex cursor-pointer items-start gap-3 rounded-xl border border-border/90 bg-card p-3 hover:border-primary/30'
        >
          <RadioGroupItem value='built' className='mt-0.5' />
          <span>
            <span className='block text-sm font-medium text-foreground'>
              Build in Campus Connect
            </span>
            <span className={quizFormHintClass}>
              Add questions here and print from the app.
            </span>
          </span>
        </label>
        <label
          className='flex cursor-pointer items-start gap-3 rounded-xl border border-border/90 bg-card p-3 hover:border-primary/30'
        >
          <RadioGroupItem value='uploaded' className='mt-0.5' />
          <span>
            <span className='block text-sm font-medium text-foreground'>
              Upload my quiz file
            </span>
            <span className={quizFormHintClass}>
              PDF or Word — enter student marks only.
            </span>
          </span>
        </label>
      </RadioGroup>
    </div>
  );
}
