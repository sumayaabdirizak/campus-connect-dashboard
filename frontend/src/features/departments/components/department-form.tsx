'use client';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { departmentSchema, DepartmentFormValues } from '../schemas/department';

// You’d fetch faculties from your API in production!
const facultyOptions = [
  { value: 1, label: 'Faculty of Engineering' },
  { value: 2, label: 'Faculty of Business' }
];

export default function DepartmentForm({
  initialData,
  pageTitle,
  onSubmit
}: {
  initialData?: DepartmentFormValues | null;
  pageTitle: string;
  onSubmit?: (values: DepartmentFormValues) => void;
}) {
  const form = useAppForm({
    defaultValues: {
      facultyId: initialData?.facultyId ?? facultyOptions[0].value,
      name: initialData?.name ?? '',
      code: initialData?.code ?? '',
      description: initialData?.description ?? '',
      established: initialData?.established ?? '',
      status: initialData?.status ?? 'active'
    },
    validators: { onSubmit: departmentSchema as any },
    onSubmit: ({ value }) => {
      if (onSubmit) onSubmit(value);
    }
  });

  const { FormTextField, FormTextareaField, FormSelectField } =
    useFormFields<DepartmentFormValues>();

  return (
    <Card className='mx-auto w-full'>
      <CardHeader>
        <CardTitle className='text-left text-2xl font-bold'>{pageTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form.AppForm>
          <form.Form className='space-y-8'>
            <FormSelectField
              name='facultyId'
              label='Faculty'
              required
              options={facultyOptions as any}
            />
            <FormTextField
              name='name'
              label='Department Name'
              required
              placeholder='e.g. Department of Physics'
            />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <FormTextField name='code' label='Department Code' placeholder='e.g. CS' />
              <FormTextField
                name='established'
                label='Establishment Date'
                placeholder='YYYY-MM-DD'
              />
              <FormSelectField
                name='status'
                label='Status'
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </div>
            <FormTextareaField
              name='description'
              label='Description'
              placeholder='Department description or mission statement'
              rows={3}
              maxLength={500}
            />
            <div className='flex justify-end gap-2'>
              <Button type='submit'>
                {initialData ? 'Update Department' : 'Create Department'}
              </Button>
            </div>
          </form.Form>
        </form.AppForm>
      </CardContent>
    </Card>
  );
}
