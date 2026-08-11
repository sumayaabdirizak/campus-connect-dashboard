'use client';

import { useAppForm, useFormFields } from '@/features/ui/components/tanstack-form';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { departmentSchema, type DepartmentFormValues } from '@/lib/departments/types';
import { handleApiError, showToast } from '@/lib/notifications';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { createDepartment, updateDepartment } from '@/lib/departments/services';
import { facultiesQueryOptions } from '@/lib/faculties/queries';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

interface Department {
  id: number;
  facultyId: number;
  name: string;
  code?: string;
  description?: string;
  established?: string;
  status: 'active' | 'inactive';
}

interface Props {
  department?: Department;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentFormSheet({ department, open, onOpenChange }: Props) {
  const isEdit = !!department;
  const queryClient = useQueryClient();
  const { data: facultyData } = useQuery(facultiesQueryOptions());
  const faculties =
    facultyData && typeof facultyData === 'object' && 'faculties' in facultyData
      ? (facultyData as { faculties: { id: number; name: string }[] }).faculties
      : facultyData && typeof facultyData === 'object' && 'results' in facultyData
        ? ((facultyData as { results: { id: number; name: string }[] }).results ?? [])
        : Array.isArray(facultyData)
          ? facultyData
          : [];
  const facultyOptions = faculties.map((faculty: { id: number; name: string }) => ({
    value: String(faculty.id),
    label: faculty.name
  }));

  const mutation = useMutation({
    mutationFn: (values: DepartmentFormValues) => {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim().toUpperCase(),
        facultyId: Number(values.facultyId)
      };
      return department
        ? updateDepartment({ id: department.id, values: payload })
        : createDepartment(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['departments'] });
      showToast(
        'success',
        isEdit ? 'Department updated successfully' : 'Department created successfully'
      );
      onOpenChange(false);
      form.reset();
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to save department')
  });

  const form = useAppForm({
    defaultValues: {
      facultyId: department?.facultyId ? String(department.facultyId) : '',
      name: department?.name ?? '',
      code: department?.code ?? '',
      description: department?.description ?? '',
      established: department?.established ?? '',
      status: department?.status ?? 'active'
    } as DepartmentFormValues,
    validators: { onSubmit: departmentSchema as never },
    onSubmit: async ({ value }) => {
      mutation.mutate(value);
    }
  });

  const { FormTextField, FormTextareaField, FormSelectField } =
    useFormFields<DepartmentFormValues>();

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Department' : 'Create New Department'}
      formId='department-form'
      submitLabel={isEdit ? 'Update' : 'Create New'}
      submitIcon={isEdit ? 'check' : 'add'}
      submitting={mutation.isPending}
      submitDisabled={facultyOptions.length === 0}
    >
      {facultyOptions.length === 0 ? (
        <p className='mb-3 rounded-lg border border-dashed p-3 text-sm'>
          Create a faculty first before adding departments.
        </p>
      ) : null}
      <form.AppForm>
        <form.Form id='department-form' className='space-y-3'>
          <FormSelectField
            name='facultyId'
            label='Faculty'
            required
            options={facultyOptions}
            placeholder='Select faculty'
          />
          <FormTextField
            name='name'
            label='Department Name'
            required
            placeholder='e.g. Department of Physics'
          />
          <FormTextField name='code' label='Code' placeholder='e.g. CS' />
          <FormTextField name='established' label='Established' placeholder='YYYY-MM-DD' />
          <FormSelectField
            name='status'
            label='Status'
            options={STATUS_OPTIONS}
            required
            placeholder='Select status'
          />
          <FormTextareaField
            name='description'
            label='Description'
            placeholder='Department description'
            maxLength={500}
          />
        </form.Form>
      </form.AppForm>
    </PosFormModal>
  );
}
