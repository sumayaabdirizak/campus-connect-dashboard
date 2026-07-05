'use client';

import { useState } from 'react';
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
import * as z from 'zod';
import { facultySchema, type FacultyFormValues } from '../schemas/faculty';
import { Icons } from '@/components/icons';
import { handleApiError, showToast } from '@/lib/notifications';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

interface Faculty {
  id: number;
  name: string;
  code: string;
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

  const form = useAppForm({
    defaultValues: {
      name: faculty?.name ?? '',
      code: faculty?.code ?? '',
      description: faculty?.description ?? '',
      established: faculty?.established ?? '',
      status: faculty?.status ?? 'active'
    } as FacultyFormValues,

    validators: {
      onSubmit: facultySchema as any
    },

    onSubmit: async ({ value }) => {
      try {
        console.log(value); // 🔥 connect API later

        showToast('success', isEdit ? 'Faculty updated successfully' : 'Faculty created successfully');

        onOpenChange(false);
        form.reset();
      } catch (error) {
        handleApiError(error, 'Something went wrong');
      }
    }
  });

  const { FormTextField, FormSelectField, FormTextareaField } = useFormFields<FacultyFormValues>();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Faculty' : 'New Faculty'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update faculty details.' : 'Create a new faculty.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form.AppForm>
            <form.Form id='faculty-form' className='space-y-4'>
              <FormTextField
                name='name'
                label='Faculty Name'
                required
                placeholder='Faculty of Engineering'
              />

              <FormTextField name='code' label='Code' required placeholder='ENG' />

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
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button type='submit' form='faculty-form'>
            <Icons.check className='mr-2 h-4 w-4' />
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
