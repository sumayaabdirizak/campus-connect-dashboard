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
import { nowLocalInput, type FormState } from './form-state';

interface ScheduleTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
}

export function ScheduleTab({ form, setForm }: ScheduleTabProps) {
  const isFixed = form.timing_mode === 'fixed';
  const rangeInvalid =
    !!form.open_at_local &&
    !!form.close_at_local &&
    new Date(form.open_at_local) >= new Date(form.close_at_local);

  // Floors both pickers at "now" — a teacher can't schedule Opens/Closes
  // into the past. Closes additionally floors at Opens once that's set, so
  // the two constraints (no-past, Closes-after-Opens) can't fight each
  // other. Only applied to interactive edits, not to whatever's already
  // stored on an existing quiz (e.g. one that's already live).
  const minOpen = nowLocalInput();
  const minClose = form.open_at_local && form.open_at_local > minOpen ? form.open_at_local : minOpen;

  // Opens/Closes/Timing mode only govern the in-app attempt window —
  // offline quizzes are never started in-app (blocked server-side), so
  // there's no window to schedule. Skip straight to a plain explanation.
  if (form.mode === 'offline') {
    return (
      <div className='mt-4 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground'>
        <CalendarOff className='w-3.5 h-3.5 shrink-0 mt-0.5' />
        <p>
          Scheduling doesn&apos;t apply to offline quizzes — there&apos;s no in-app window to
          open or close since students never start it here. Print the handout when you&apos;re
          ready to hand it out.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-3 mt-4'>
      <div className='space-y-1.5'>
        <Label>Timing mode</Label>
        <Select
          value={form.timing_mode}
          onValueChange={(v) =>
            setForm({ ...form, timing_mode: v as 'flexible' | 'fixed' })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='flexible'>
              Flexible — student starts whenever they open it
            </SelectItem>
            <SelectItem value='fixed'>
              Fixed — timed window, everyone starts at &quot;Opens&quot;
            </SelectItem>
          </SelectContent>
        </Select>
        <p className='text-[11px] text-muted-foreground'>
          {isFixed
            ? `Everyone's timer starts at "Opens" and runs for the Duration set on the Behavior tab (${form.duration_minutes} min).`
            : 'Each student\'s timer starts when they open the quiz.'}
        </p>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-open'>Opens</Label>
          <Input
            id='quiz-open'
            type='datetime-local'
            min={minOpen}
            value={form.open_at_local}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, open_at_local: v && v < minOpen ? minOpen : v });
            }}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-close'>Closes</Label>
          <Input
            id='quiz-close'
            type='datetime-local'
            min={minClose}
            value={form.close_at_local}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, close_at_local: v && v < minClose ? minClose : v });
            }}
            disabled={isFixed}
            aria-invalid={rangeInvalid}
            className={rangeInvalid ? 'border-destructive focus-visible:ring-destructive/50' : undefined}
          />
        </div>
      </div>
      {rangeInvalid ? (
        <p className='text-[11px] text-destructive font-medium'>
          Closes must be after Opens — right now it&apos;s the other way around.
        </p>
      ) : (
        <p className='text-[11px] text-muted-foreground'>
          {isFixed
            ? 'Closes is ignored in Fixed mode — the window ends automatically at Opens + Duration, above.'
            : 'Leave both blank for an always-open quiz. Times use your local timezone.'}
        </p>
      )}
    </div>
  );
}
