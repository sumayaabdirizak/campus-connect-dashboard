'use client';

import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  attendanceSessionSchema,
  type AttendanceSessionFormValues
} from '../schemas/attendance-session';

/**
 * Reference implementation of `useAppForm` for the course-details feature.
 * Previously, the "New session" dialog used five `useState` calls and an
 * imperative `handleCreateSession` validator — bypassing the project's
 * TanStack Form + Zod pipeline that's documented in CLAUDE.md.
 *
 * This component takes:
 *   - `onSubmit`  fired with validated values once Zod is happy
 *   - `onCancel`  closes the dialog without saving
 *   - `submitting` shows the loading state from the parent's mutation
 *
 * The fields are uncontrolled — TanStack Form owns the values. The parent
 * holds onto the dialog open/close state because that's a UI concern
 * separate from the form's data lifecycle.
 *
 * Field labels: kept terse to match the original dialog's vibe (the
 * dialog title "New session" already tells the user what they're doing).
 */

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export interface AttendanceSessionFormProps {
  onSubmit: (values: AttendanceSessionFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function AttendanceSessionForm({
  onSubmit,
  onCancel,
  submitting
}: AttendanceSessionFormProps) {
  const form = useAppForm({
    defaultValues: {
      day_of_week: new Date().getDay(),
      start_time: '09:00',
      end_time: '10:30',
      location: '',
      topic: '',
      is_lab: false
    } as AttendanceSessionFormValues,
    // `as any` here mirrors the pattern from department-form.tsx — the Zod
    // schema is typed loosely on the TanStack Form generic side, but
    // runtime validation works correctly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: attendanceSessionSchema as any },
    onSubmit: ({ value }) => onSubmit(value)
  });

  const { FormTextField, FormSelectField, FormCheckboxField } =
    useFormFields<AttendanceSessionFormValues>();

  return (
    <form.AppForm>
      <form.Form className='space-y-3 py-2'>
        <FormSelectField
          name='day_of_week'
          label='Day of week'
          // SelectField expects string values internally; TanStack Form will
          // coerce via the Zod schema on submit.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          options={DAY_OPTIONS as any}
        />
        {/* `FormTextField`'s `type` union doesn't include 'time', so we drop
            to `form.AppField` and render a raw `<Input type='time'>` exactly
            as `create-assignment-form.tsx` does for its datetime fields. */}
        <div className='grid grid-cols-2 gap-2'>
          <form.AppField name='start_time'>
            {(field) => (
              <div className='space-y-1'>
                <Label htmlFor='start_time'>Start</Label>
                <Input
                  id='start_time'
                  type='time'
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors[0] && (
                  <p className='text-xs text-destructive'>
                    {String(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.AppField>
          <form.AppField name='end_time'>
            {(field) => (
              <div className='space-y-1'>
                <Label htmlFor='end_time'>End</Label>
                <Input
                  id='end_time'
                  type='time'
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors[0] && (
                  <p className='text-xs text-destructive'>
                    {String(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.AppField>
        </div>
        <FormTextField
          name='location'
          label='Location'
          placeholder='Room 204, Block A'
          required
        />
        <FormTextField
          name='topic'
          label='Topic'
          placeholder='Optional — e.g. "Big-O recap"'
        />
        <FormCheckboxField name='is_lab' label='This is a lab session' />

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={submitting}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
