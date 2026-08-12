'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Clock } from 'lucide-react';
import type { FormState } from './form-state';

interface ScheduleTabProps {
  form: FormState;
  setForm: (next: FormState) => void;
}

export function ScheduleTab({ form, setForm }: ScheduleTabProps) {
  return (
    <div className='space-y-3 mt-4'>
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-open'>Opens</Label>
          <Input
            id='quiz-open'
            type='datetime-local'
            value={form.open_at_local}
            onChange={(e) => setForm({ ...form, open_at_local: e.target.value })}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='quiz-close'>Closes</Label>
          <Input
            id='quiz-close'
            type='datetime-local'
            value={form.close_at_local}
            onChange={(e) => setForm({ ...form, close_at_local: e.target.value })}
          />
        </div>
      </div>
      <p className='text-[11px] text-muted-foreground'>
        Leave both blank for an always-open quiz. Times use your local timezone.
      </p>

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
      </div>

      {form.timing_mode === 'fixed' ? (
        <div className='space-y-1.5 rounded-md border p-3 bg-muted/30'>
          <Label htmlFor='quiz-sched-dur' className='flex items-center gap-1'>
            <Clock className='w-3.5 h-3.5' />
            Scheduled duration (min)
          </Label>
          <Input
            id='quiz-sched-dur'
            type='number'
            min={1}
            max={480}
            value={form.scheduled_duration ?? ''}
            onChange={(e) =>
              setForm({
                ...form,
                scheduled_duration: e.target.value ? Number(e.target.value) : null
              })
            }
            placeholder={`Defaults to ${form.duration_minutes} min`}
          />
          <p className='text-[11px] text-muted-foreground'>
            Per-student time budget in fixed mode. Leave blank to use the Duration from the
            Behavior tab ({form.duration_minutes} min).
          </p>
        </div>
      ) : null}
    </div>
  );
}
