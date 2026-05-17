'use client';

import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { departmentSchema, type DepartmentFormValues } from '../schemas/department';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';

// You'd populate this from API in production
const FACULTY_OPTIONS = [
  { value: 1, label: 'Faculty of Engineering' },
  { value: 2, label: 'Faculty of Business' }
];

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

  const form = useAppForm({
    defaultValues: {
      facultyId: department?.facultyId ?? FACULTY_OPTIONS[0].value,
      name: department?.name ?? '',
      code: department?.code ?? '',
      description: department?.description ?? '',
      established: department?.established ?? '',
      status: department?.status ?? 'active'
    } as DepartmentFormValues,

    validators: {
      onSubmit: departmentSchema as any
    },

    onSubmit: async ({ value }) => {
      try {
        console.log(value); // Connect to API here in real use!
        toast.success(
          isEdit ? 'Department updated successfully' : 'Department created successfully'
        );
        onOpenChange(false);
        form.reset();
      } catch {
        toast.error('Something went wrong');
      }
    }
  });

  const { FormTextField, FormTextareaField, FormSelectField } =
    useFormFields<DepartmentFormValues>();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Department' : 'New Department'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update department details.'
              : 'Create a new department and assign it to a faculty.'}
          </SheetDescription>
        </SheetHeader>
        <div className='flex-1 overflow-auto'>
          <form.AppForm>
            <form.Form id='department-form' className='space-y-4'>
              <FormSelectField
                name='facultyId'
                label='Faculty'
                required
                options={FACULTY_OPTIONS as any}
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
                placeholder='Department description or mission statement'
                maxLength={500}
              />
            </form.Form>
          </form.AppForm>
        </div>
        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type='submit' form='department-form'>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
