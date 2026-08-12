'use client';

import { Button } from '@/components/ui/button';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import {
  assignmentSchema,
  defaultAssignmentValues,
  type AssignmentFormValues
} from './schema';
import { DatetimeField } from './datetime-fields';
import { MaxMarksField } from './max-marks-field';

interface CreateAssignmentFormProps {
  initialValues?: Partial<AssignmentFormValues>;
  onSubmit: (values: AssignmentFormValues) => Promise<void> | void;
  pending?: boolean;
  onCancel: () => void;
}

export function CreateAssignmentForm({
  initialValues,
  onSubmit,
  pending,
  onCancel
}: CreateAssignmentFormProps) {
  const form = useAppForm({
    defaultValues: { ...defaultAssignmentValues, ...initialValues } as AssignmentFormValues,
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
          <form.AppField name='open_at'>
            {(field) => (
              <DatetimeField
                id='open_at'
                label='Open at'
                value={field.state.value as string}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                hint='Leave empty to open immediately.'
                error={
                  field.state.meta.errors[0]
                    ? String(field.state.meta.errors[0])
                    : undefined
                }
              />
            )}
          </form.AppField>
          <form.AppField name='due_date'>
            {(field) => (
              <DatetimeField
                id='due_date'
                label={
                  <>
                    Due date <span className='text-destructive'>*</span>
                  </>
                }
                value={field.state.value as string}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                required
                error={
                  field.state.meta.errors[0]
                    ? String(field.state.meta.errors[0])
                    : undefined
                }
              />
            )}
          </form.AppField>
        </div>
        <div className='grid grid-cols-2 gap-3'>
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
            <MaxMarksField
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={
                field.state.meta.errors[0]
                  ? String(field.state.meta.errors[0])
                  : undefined
              }
            />
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
