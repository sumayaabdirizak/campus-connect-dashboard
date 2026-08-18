'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import type { FormState } from './form-state';

export function DurationField({
  form,
  setForm
}: {
  form: FormState;
  setForm: (next: FormState) => void;
}) {
  return (
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
            duration_minutes: Math.min(480, Math.max(1, Number(e.target.value) || 1))
          })
        }
      />
      <p className='text-[11px] text-muted-foreground'>
        {form.timing_mode === 'flexible'
          ? 'Each student gets this many minutes once they start the quiz.'
          : 'In fixed mode, everyone\'s timer runs for this many minutes starting at "Opens" (set on the Schedule tab).'}
      </p>
    </div>
  );
}
