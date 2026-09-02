'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import {
  assignmentSchema,
  defaultAssignmentValues,
  type AssignmentFormValues
} from './schema';
import { DatetimeField } from './datetime-fields';
import { assignmentFormFieldClass } from './field-styles';
import { MaxMarksField } from './max-marks-field';
import { handleExtensionDateChange, toDatetimeLocalMin } from '../extension-date-utils';
import type { CourseMarkBudget } from '@/lib/course-details/services/mark-budget-service';
import {
  markBudgetExceededMessage,
  wouldExceedMarkBudget
} from '@/lib/course-details/services/mark-budget-utils';
import { toast } from 'sonner';

function fieldError(errors: unknown[]): string | undefined {
  const first = errors[0];
  if (first == null) return undefined;
  if (typeof first === 'string' && first !== '[object Object]') return first;
  if (typeof first === 'object' && first !== null && 'message' in first) {
    const msg = (first as { message: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return undefined;
}

interface CreateAssignmentFormProps {
  initialValues?: Partial<AssignmentFormValues>;
  onSubmit: (values: AssignmentFormValues) => Promise<void> | void;
  pending?: boolean;
  onCancel: () => void;
  submitLabel?: string;
  pendingLabel?: string;
  extraFields?: React.ReactNode;
  showSubmitIcon?: boolean;
  markBudget?: CourseMarkBudget;
  /** When editing a published assignment, its current maxMarks (excluded from allocated). */
  excludePublishedMarks?: number;
  /** Block save when marks exceed budget (create + published edit). */
  enforceMarkBudget?: boolean;
}

export function CreateAssignmentForm({
  initialValues,
  onSubmit,
  pending,
  onCancel,
  submitLabel = 'Create',
  pendingLabel = 'Creating…',
  extraFields,
  showSubmitIcon = true,
  markBudget,
  excludePublishedMarks = 0,
  enforceMarkBudget = true
}: CreateAssignmentFormProps) {
  const form = useAppForm({
    defaultValues: { ...defaultAssignmentValues, ...initialValues } as AssignmentFormValues,
    validators: { onChange: assignmentSchema },
    onSubmit: async ({ value }) => {
      if (
        enforceMarkBudget &&
        markBudget &&
        wouldExceedMarkBudget(markBudget, value.maxMarks, excludePublishedMarks)
      ) {
        toast.error(
          markBudgetExceededMessage(markBudget, value.maxMarks, excludePublishedMarks)
        );
        return;
      }
      await onSubmit(value);
    }
  });

  const { FormTextField, FormTextareaField, FormSelectField, FormSwitchField } =
    useFormFields<AssignmentFormValues>();

  return (
    <form.AppForm>
      <form.Form className='flex min-h-0 flex-1 flex-col'>
        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 [&_[data-slot=select-trigger]]:w-full'>
          {extraFields}
          <FormTextField
            name='title'
            label='Title'
            required
            placeholder='e.g. Assignment 1'
            className={assignmentFormFieldClass}
          />
          <FormTextareaField
            name='description'
            label='Instructions'
            rows={3}
            placeholder='What students should do'
            maxLength={2000}
            className={assignmentFormFieldClass}
          />
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <form.AppField name='open_at'>
              {(field) => (
                <DatetimeField
                  id='open_at'
                  label='Open at'
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(value) =>
                    handleExtensionDateChange(value, field.handleChange)
                  }
                  min={toDatetimeLocalMin()}
                  hint='Leave empty to open immediately.'
                  error={fieldError(field.state.meta.errors)}
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
                  onChange={(value) =>
                    handleExtensionDateChange(value, field.handleChange)
                  }
                  min={toDatetimeLocalMin()}
                  required
                  error={fieldError(field.state.meta.errors)}
                />
              )}
            </form.AppField>
            <FormSelectField
              name='workMode'
              label='Work mode'
              required
              options={[
                { value: 'INDIVIDUAL', label: 'Individual' },
                { value: 'GROUP', label: 'Group' }
              ]}
              triggerClassName={assignmentFormFieldClass}
            />
            <FormSelectField
              name='gradingScope'
              label='Grading'
              required
              options={[
                { value: 'INDIVIDUAL', label: 'Per student' },
                { value: 'GROUP', label: 'Per group' }
              ]}
              triggerClassName={assignmentFormFieldClass}
            />
            <form.AppField name='maxMarks'>
              {(field) => (
                <MaxMarksField
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  error={fieldError(field.state.meta.errors)}
                  markBudget={markBudget}
                  excludePublishedMarks={excludePublishedMarks}
                  courseMaxMarks={markBudget?.courseMax}
                />
              )}
            </form.AppField>
            <FormSwitchField name='allowLate' label='Allow late submissions' />
          </div>
          <form.Subscribe selector={(s) => s.values.allowLate}>
            {(allowLate) =>
              allowLate ? (
                <FormTextField
                  name='lateWindow'
                  label='Late window (minutes)'
                  type='number'
                  className={assignmentFormFieldClass}
                />
              ) : null
            }
          </form.Subscribe>
        </div>
        <DialogFooter className='flex-row items-center justify-between gap-2 border-t border-border px-5 py-4 sm:justify-between'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <form.Subscribe selector={(s) => s.values.maxMarks}>
            {(maxMarks) => {
              const blocked =
                enforceMarkBudget &&
                markBudget != null &&
                wouldExceedMarkBudget(markBudget, maxMarks, excludePublishedMarks);
              return (
                <Button type='submit' disabled={pending || blocked} className='gap-1.5'>
                  {showSubmitIcon ? <Plus className='size-4' aria-hidden /> : null}
                  {pending ? pendingLabel : submitLabel}
                </Button>
              );
            }}
          </form.Subscribe>
        </DialogFooter>
      </form.Form>
    </form.AppForm>
  );
}
