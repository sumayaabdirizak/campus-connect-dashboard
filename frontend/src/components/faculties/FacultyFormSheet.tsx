'use client';

import { useAppForm, useFormFields } from '@/features/ui/components/tanstack-form';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { facultySchema, type FacultyFormValues } from '@/lib/faculties/types';
import { handleApiError, showToast } from '@/lib/notifications';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { createFacultyMutation, updateFacultyMutation } from '@/lib/faculties/queries';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const DURATION_OPTIONS = [
  { value: '3', label: '3 years (6 semesters)' },
  { value: '4', label: '4 years (8 semesters)' },
  { value: '5', label: '5 years (10 semesters)' },
  { value: '6', label: '6 years (12 semesters)' }
];

interface Faculty {
  id: number;
  name: string;
  code: string;
  defaultDurationYears?: number;
  description?: string;
  established: string;
  status: 'active' | 'inactive';
}

interface Props {
  faculty?: Faculty;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FacultyFormSheet({ faculty, open, onOpenChange }: Props) {
  const isEdit = !!faculty;
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: FacultyFormValues) =>
      faculty
        ? updateFacultyMutation.mutationFn({ id: faculty.id, values })
        : createFacultyMutation.mutationFn(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['faculties'] });
      showToast(
        'success',
        isEdit ? 'Faculty updated successfully' : 'Faculty created successfully'
      );
      onOpenChange(false);
      form.reset();
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to save faculty')
  });

  const form = useAppForm({
    defaultValues: {
      name: faculty?.name ?? '',
      code: faculty?.code ?? '',
      defaultDurationYears: String(faculty?.defaultDurationYears ?? 4),
      description: faculty?.description ?? '',
      established: faculty?.established ?? '',
      status: faculty?.status ?? 'active'
    } as unknown as FacultyFormValues,
    validators: { onSubmit: facultySchema as never },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    }
  });

  const { FormTextField, FormSelectField, FormTextareaField } = useFormFields<FacultyFormValues>();

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Faculty' : 'Create New Faculty'}
      formId='faculty-form'
      submitLabel={isEdit ? 'Update' : 'Create New'}
      submitIcon={isEdit ? 'check' : 'add'}
      submitting={mutation.isPending}
    >
      <form.AppForm>
        <form.Form id='faculty-form' className='space-y-3'>
          <FormTextField
            name='name'
            label='Faculty Name'
            required
            placeholder='Faculty of Engineering'
          />
          <FormTextField name='code' label='Code' required placeholder='ENG' />
          <FormSelectField
            name='defaultDurationYears'
            label='Default program duration'
            required
            options={DURATION_OPTIONS}
            placeholder='Select duration'
          />
          <FormTextField name='established' label='Established' required />
          <FormSelectField
            name='status'
            label='Status'
            required
            options={STATUS_OPTIONS}
            placeholder='Select status'
          />
          <FormTextareaField
            name='description'
            label='Description'
            placeholder='Short description...'
          />
        </form.Form>
      </form.AppForm>
    </PosFormModal>
  );
}
