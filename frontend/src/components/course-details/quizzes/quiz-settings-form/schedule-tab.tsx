'use client';

import { CalendarOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
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

  const isFixed = form.timing_mode !== 'flexible';

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
            setForm({
              ...form,
              open_at_local: v,
              // Fixed mode's close is derived from open + duration; flexible
              // mode's close_at is the teacher-set window end, left as-is.
              close_at_local: isFixed ? '' : form.close_at_local
            })
          );
        }}
        className={quizFormFieldClass}
      />
    </div>
  );

  const closeField = !isFixed ? (
    <div className='space-y-1.5'>
      <Label htmlFor='quiz-close' className={quizFormLabelClass}>
        Closes at
      </Label>
      <Input
        id='quiz-close'
        type='datetime-local'
        min={form.open_at_local || minOpen}
        value={form.close_at_local}
        onChange={(e) => setForm({ ...form, close_at_local: e.target.value })}
        className={quizFormFieldClass}
      />
    </div>
  ) : null;

  return (
    <div className={`space-y-3 ${withDuration ? '' : 'mt-4'}`}>
      <div className='space-y-1.5'>
        <Label className={quizFormLabelClass}>Timing</Label>
        <SegmentedControl
          ariaLabel='Timing mode'
          value={form.timing_mode}
          onChange={(mode) =>
            setForm({
              ...form,
              timing_mode: mode,
              close_at_local: mode === 'fixed' ? '' : form.close_at_local
            })
          }
          options={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'flexible', label: 'Flexible' }
          ]}
        />
      </div>

      {withDuration ? (
        <div className='grid gap-3 sm:grid-cols-2'>
          <DurationField form={form} setForm={setForm} fullWidth hideHint />
          {openField}
          {closeField}
        </div>
      ) : (
        <>
          {openField}
          {closeField}
        </>
      )}
      <p className={quizFormHintClass}>
        {isFixed
          ? form.open_at_local
            ? `Everyone starts together; the quiz closes ${form.duration_minutes} min after Available from.`
            : 'Set "Available from" — the quiz closes after the time limit.'
          : form.open_at_local && form.close_at_local
            ? `Students can start any time between Available from and Closes at; each gets ${form.duration_minutes} min from when they start.`
            : 'Set "Available from" and "Closes at" — students get the full time limit from whenever they start within that window.'}
      </p>
    </div>
  );
}
