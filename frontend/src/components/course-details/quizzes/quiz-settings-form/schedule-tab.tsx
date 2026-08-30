'use client';

import { CalendarOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  handleExtensionDateChange,
  isPastExtensionDate,
  toDatetimeLocalMin
} from '../../assignments/extension-date-utils';
import {
  quizFormFieldClass,
  quizFormHintClass,
  quizFormLabelClass,
  quizFormSelectClass
} from '../new-quiz-page/field-styles';
import { toast } from 'sonner';
import { DurationField } from './duration-field';
import { fixedWindowEndLocal, type FormState } from './form-state';

interface ScheduleTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
  /** Puts time limit beside “How the timer works” on one row. */
  withDuration?: boolean;
}

export function ScheduleTab({ form, setForm, withDuration }: ScheduleTabProps) {
  const isFixed = form.timing_mode === 'fixed';
  const fixedCloseDisplay = fixedWindowEndLocal(
    form.open_at_local,
    form.duration_minutes
  );
  const rangeInvalid =
    !isFixed &&
    !!form.open_at_local &&
    !!form.close_at_local &&
    new Date(form.open_at_local) >= new Date(form.close_at_local);

  // Floors both pickers at "now" — a teacher can't schedule Opens/Closes
  // into the past. Closes additionally floors at Opens once that's set, so
  // the two constraints (no-past, Closes-after-Opens) can't fight each
  // other. Only applied to interactive edits, not to whatever's already
  // stored on an existing quiz (e.g. one that's already live).
  const minOpen = toDatetimeLocalMin();
  const minClose =
    form.open_at_local && form.open_at_local > minOpen ? form.open_at_local : minOpen;

  // Opens/Closes/Timing mode only govern the in-app attempt window —
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

  const timingModeField = (
    <div className='space-y-1.5'>
      <Label className={quizFormLabelClass}>How the timer works</Label>
      <Select
        value={form.timing_mode}
        onValueChange={(v) => {
          const timing_mode = v as 'flexible' | 'fixed';
          setForm({
            ...form,
            timing_mode,
            ...(timing_mode === 'fixed' ? { close_at_local: '' } : {})
          });
        }}
      >
        <SelectTrigger className={quizFormSelectClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='flexible'>Each student gets their own timer</SelectItem>
          <SelectItem value='fixed'>Everyone takes it at the same time</SelectItem>
        </SelectContent>
      </Select>
     <p className={quizFormHintClass}>
  {isFixed
    ? `"Available from" + ${form.duration_minutes} min`
    : 'Starts when student opens the quiz.'}
</p>
    </div>
  );

  return (
    <div className={`space-y-3 ${withDuration ? '' : 'mt-4'}`}>
      {withDuration ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          <DurationField form={form} setForm={setForm} fullWidth />
          {timingModeField}
        </div>
      ) : (
        timingModeField
      )}

      <div className='grid grid-cols-2 gap-3'>
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
                setForm({ ...form, open_at_local: v })
              );
            }}
            className={quizFormFieldClass}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-close' className={quizFormLabelClass}>
            {isFixed ? 'Closes at' : 'Available until'}
          </Label>
          <Input
            id='quiz-close'
            type='datetime-local'
            min={minClose}
            value={isFixed ? fixedCloseDisplay : form.close_at_local}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                setForm({ ...form, close_at_local: '' });
                return;
              }
              if (isPastExtensionDate(v) || v < minClose) {
                toast.error('Pick a future date after “Available from”');
                setForm({ ...form, close_at_local: '' });
                return;
              }
              setForm({ ...form, close_at_local: v });
            }}
            disabled={isFixed}
            readOnly={isFixed}
            aria-invalid={rangeInvalid}
            title={
              isFixed
                ? 'Calculated from Available from plus the time limit'
                : undefined
            }
            className={`${quizFormFieldClass} ${isFixed ? 'bg-muted text-muted-foreground' : ''} ${rangeInvalid ? 'border-destructive focus-visible:ring-destructive/50' : ''}`}
          />
        </div>
      </div>
      {rangeInvalid ? (
        <p className='text-sm font-medium text-destructive'>
          &quot;Available until&quot; needs to be after &quot;Available from&quot; — right now
          it&apos;s the other way around.
        </p>
      ) : (
        <p className={quizFormHintClass}>
          {isFixed
            ? form.open_at_local
              ? 'Everyone\'s window ends at the time shown — set by Available from plus the time limit.'
              : 'Set "Available from" to see when the quiz closes.'
            : 'Leave both blank to let students take it any time. Times use your local timezone.'}
        </p>
      )}
    </div>
  );
}
