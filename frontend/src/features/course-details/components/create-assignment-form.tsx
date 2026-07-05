'use client';

import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import type { AssignmentGradingScope, AssignmentWorkMode } from '../api/assignments-types';

export const assignmentSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(160),
    description: z.string().max(2000).optional().or(z.literal('')),
    open_at: z.string().optional().or(z.literal('')),
    due_date: z.string().min(1, 'Due date is required'),
    workMode: z.enum(['INDIVIDUAL', 'GROUP']),
    gradingScope: z.enum(['INDIVIDUAL', 'GROUP']),
    allowLate: z.boolean(),
    lateWindow: z.string().regex(/^\d+$/, 'Must be a number').or(z.literal('')),
    maxMarks: z.number().int().min(1, 'Must be at least 1').max(100, 'Cannot exceed 100')
  })
  .superRefine((v, ctx) => {
    // Solo work can't share a group grade.
    if (v.workMode === 'INDIVIDUAL' && v.gradingScope === 'GROUP') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gradingScope'],
        message: 'Solo work cannot use group grading'
      });
    }
    // open_at must be strictly before due_date.
    if (v.open_at && new Date(v.open_at) >= new Date(v.due_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['open_at'],
        message: 'Open time must be before the due date'
      });
    }
  });

export type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface CreateAssignmentFormProps {
  initialValues?: Partial<AssignmentFormValues>;
  /// Called with validated values. Caller handles the mutation + dialog close.
  onSubmit: (values: AssignmentFormValues) => Promise<void> | void;
  /// Loading flag to disable the submit button while a request is in flight.
  pending?: boolean;
  /// Called when the user clicks Cancel.
  onCancel: () => void;
}

/**
 * Type-safe Create Assignment form using TanStack Form + Zod.
 *
 * The previous version was a `useState`-per-field hairball with imperative
 * `if (!form.title.trim()) toast.error(...)` validation. This version:
 *   - declares the shape once (Zod)
 *   - gets per-field validation errors / aria-invalid / focus management
 *     for free via `useFormFields<T>()`
 *   - cross-field rules (open_at < due_date, INDIVIDUAL+GROUP rejected) live
 *     in `superRefine` alongside the schema
 *
 * Used by Create Assignment; the same pattern fits Create Quiz / Create
 * Session.
 */
export function CreateAssignmentForm({
  initialValues,
  onSubmit,
  pending,
  onCancel
}: CreateAssignmentFormProps) {
  const form = useAppForm({
    defaultValues: {
      title: '',
      description: '',
      open_at: '',
      due_date: '',
      workMode: 'INDIVIDUAL' as AssignmentWorkMode,
      gradingScope: 'INDIVIDUAL' as AssignmentGradingScope,
      allowLate: false,
      lateWindow: '0',
      maxMarks: 100,
      ...initialValues
    } as AssignmentFormValues,
    validators: { onChange: assignmentSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    }
  });

  const { FormTextField, FormTextareaField, FormSelectField, FormSwitchField } =
    useFormFields<AssignmentFormValues>();

  return (
    <form.AppForm>
      <form.Form className='space-y-4'>
        <FormTextField name='title' label='Title' required placeholder='e.g. Assignment 1' />
        <FormTextareaField
          name='description'
          label='Instructions'
          rows={4}
          placeholder='Instructions, rubric, links to references…'
          maxLength={2000}
        />
        <div className='grid grid-cols-2 gap-3'>
          {/* datetime-local isn't in FormTextField's allowed `type` union,
              so we drop to AppField for a raw <Input type=datetime-local>. */}
          <form.AppField name='open_at'>
            {(field) => (
              <div className='space-y-1'>
                <Label htmlFor='open_at'>Open at</Label>
                <Input
                  id='open_at'
                  type='datetime-local'
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <p className='text-[10px] text-muted-foreground'>
                  Leave empty to open immediately.
                </p>
                {field.state.meta.errors[0] && (
                  <p className='text-xs text-destructive'>
                    {String(field.state.meta.errors[0])}
                  </p>
                )}
              </div>
            )}
          </form.AppField>
          <form.AppField name='due_date'>
            {(field) => (
              <div className='space-y-1'>
                <Label htmlFor='due_date'>
                  Due date <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='due_date'
                  type='datetime-local'
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
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
        <div className='grid grid-cols-2 gap-3'>
          {/* Work mode controls whether Grading is locked or selectable; we
              don't try to disable the Grading select declaratively here —
              the schema's cross-field check is the source of truth. */}
          <FormSelectField
            name='workMode'
            label='Work mode'
            required
            options={[
              { value: 'INDIVIDUAL', label: 'Individual' },
              { value: 'GROUP', label: 'Group' }
            ]}
          />
          <FormSelectField
            name='gradingScope'
            label='Grading'
            required
            options={[
              { value: 'INDIVIDUAL', label: 'Per student' },
              { value: 'GROUP', label: 'Per group (fan-out)' }
            ]}
          />
        </div>
        <FormSwitchField name='allowLate' label='Allow late submissions' />
        {/* Conditional render based on the live form value. */}
        <form.Subscribe selector={(s) => s.values.allowLate}>
          {(allowLate) =>
            allowLate ? (
              <FormTextField
                name='lateWindow'
                label='Late window (minutes after due)'
                type='number'
              />
            ) : null
          }
        </form.Subscribe>
        <form.AppField name='maxMarks'>
          {(field) => (
            <div className='space-y-1'>
              <Label htmlFor='maxMarks'>Total marks</Label>
              <Input
                id='maxMarks'
                type='number'
                min={1}
                max={100}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    field.handleChange(0);
                    return;
                  }
                  const parsed = Number(raw);
                  if (!Number.isFinite(parsed)) return;
                  field.handleChange(Math.min(100, Math.max(1, Math.trunc(parsed))));
                }}
                placeholder='100'
              />
              {field.state.meta.errors[0] && (
                <p className='text-xs text-destructive'>
                  {String(field.state.meta.errors[0])}
                </p>
              )}
            </div>
          )}
        </form.AppField>
        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={pending}>
            {pending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
