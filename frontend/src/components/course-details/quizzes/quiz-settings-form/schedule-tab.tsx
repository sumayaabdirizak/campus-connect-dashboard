'use client';

import { CalendarOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  handleExtensionDateChange,
  toDatetimeLocalMin
} from '../../assignments/extension-date-utils';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass
} from '../new-quiz-page/field-styles';
import { DurationField } from './duration-field';
import { type FormState } from './form-state';

interface ScheduleTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
  /** Puts time limit beside Available from on one row. */
  withDuration?: boolean;
}

export function ScheduleTab({ form, setForm, withDuration }: ScheduleTabProps) {
  // Floors Opens at "now" — a teacher can't schedule into the past.
  // Only applied to interactive edits, not to whatever's already stored
  // on an existing quiz (e.g. one that's already live).
  const minOpen = toDatetimeLocalMin();

  // Opens only govern the in-app attempt window —
  // offline quizzes are never started in-app (blocked server-side), so
  // there's no window to schedule. Skip straight to a plain explanation.
  if (form.mode === 'offline') {
    return (
      <div className='mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground'>
        <CalendarOff className='w-3.5 h-3.5 shrink-0 mt-0.5' />
        <p>
          Nothing to schedule for a printed quiz — students never open it here, so there&apos;s no
          start or end time to set. Print it when you&apos;re ready to hand it out.
        </p>
      </div>
    );
  }

  const openField = (
    <div className='space-y-1.5'>
      <Label htmlFor='quiz-open' className={quizFormLabelClass}>
        Available from
      </Label>
      <Input
        id='quiz-open'
        type='datetime-local'
        min={minOpen}
        value={form.open_at_local}
        onChange={(e) => {
          handleExtensionDateChange(e.target.value, (v) =>
            setForm({ ...form, timing_mode: 'fixed', open_at_local: v, close_at_local: '' })
          );
        }}
        className={quizFormFieldClass}
      />
    </div>
  );

  return (
    <div className={`space-y-3 ${withDuration ? '' : 'mt-4'}`}>
      {withDuration ? (
        <div className='grid gap-3 sm:grid-cols-2'>
          <DurationField form={form} setForm={setForm} fullWidth hideHint />
          {openField}
        </div>
      ) : (
        openField
      )}
      <p className={quizFormHintClass}>
        {form.open_at_local
          ? `Everyone starts together; the quiz closes ${form.duration_minutes} min after Available from.`
          : 'Set "Available from" — the quiz closes after the time limit.'}
      </p>
    </div>
  );
}
