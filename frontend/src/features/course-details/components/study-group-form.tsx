'use client';

import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import { studyGroupSchema, type StudyGroupFormValues } from '../schemas/study-group';

/**
 * Tiny one-field form for the Groups tab's "Create Group" dialog.
 *
 * Replaces the inline `useState('')` + manual `.trim()` check with the
 * project's standard TanStack Form + Zod pipeline. The whitespace-only
 * check moved into the schema (`.trim().min(1)`), so the submit button is
 * enabled automatically based on Zod validity rather than a hand-rolled
 * `!newName.trim()` predicate.
 */
export interface StudyGroupFormProps {
  onSubmit: (values: StudyGroupFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function StudyGroupForm({ onSubmit, onCancel, submitting }: StudyGroupFormProps) {
  const form = useAppForm({
    defaultValues: { name: '' } as StudyGroupFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: studyGroupSchema as any },
    onSubmit: ({ value }) => onSubmit(value)
  });

  const { FormTextField } = useFormFields<StudyGroupFormValues>();

  return (
    <form.AppForm>
      <form.Form className='space-y-4 py-2'>
        <FormTextField
          name='name'
          label='Group name'
          placeholder='e.g. "Sorting & Big-O study group"'
          required
        />
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
