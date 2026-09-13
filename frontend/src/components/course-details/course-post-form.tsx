'use client';

import { useAppForm, useFormFields } from '@/features/ui/components/tanstack-form';
import { Button } from '@/features/ui/components/button';
import { coursePostSchema, type CoursePostFormValues } from '@/lib/course-details/schemas/course-post';

export interface CoursePostFormProps {
  onSubmit: (values: CoursePostFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function CoursePostForm({ onSubmit, onCancel, submitting }: CoursePostFormProps) {
  const form = useAppForm({
    defaultValues: { title: '', content: '' } as CoursePostFormValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validators: { onSubmit: coursePostSchema as any },
    onSubmit: ({ value }) => onSubmit(value)
  });

  const { FormTextField, FormTextareaField } = useFormFields<CoursePostFormValues>();

  return (
    <form.AppForm>
      <form.Form className='space-y-4 py-2'>
        <FormTextField name='title' label='Title' placeholder='Title' required />
        <FormTextareaField
          name='content'
          label='Message'
          placeholder='Write your update…'
          rows={5}
          required
        />

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={submitting}>
            {submitting ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
