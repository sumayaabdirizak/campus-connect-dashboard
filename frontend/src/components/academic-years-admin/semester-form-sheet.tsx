'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import {
  createAdminSemester,
  updateAdminSemester,
  type AdminSemester
} from '@/lib/academic-years-admin/services';
import { toDateInputValue } from '@/lib/academic-years-admin/services/format-dates';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearId: number;
  yearName: string;
  semester?: AdminSemester;
};

export function SemesterFormSheet({ open, onOpenChange, yearId, yearName, semester }: Props) {
  const isEdit = Boolean(semester);
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(semester?.name ?? '');
    setStartDate(semester ? toDateInputValue(semester.start_date) : '');
    setEndDate(semester ? toDateInputValue(semester.end_date) : '');
  }, [open, semester]);

  const mutation = useMutation({
    mutationFn: (values: { name: string; start_date: string; end_date: string }) =>
      isEdit && semester
        ? updateAdminSemester(yearId, semester.id, values)
        : createAdminSemester(yearId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['admin-semesters-flat'] });
      showToast('success', isEdit ? 'Semester updated' : 'Semester created (next global #)');
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to save semester')
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!startDate || !endDate) {
      showToast('error', 'Start and end dates are required');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      start_date: startDate,
      end_date: endDate
    });
  };

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Semester' : 'Create New Semester'}
      formId='semester-form'
      submitLabel={isEdit ? 'Update' : 'Create New'}
      submitIcon={isEdit ? 'check' : 'add'}
      submitting={mutation.isPending}
    >
      <form id='semester-form' onSubmit={submit} className='space-y-3'>
        <p className='text-xs text-muted-foreground'>
          Academic year: <span className='font-medium text-foreground'>{yearName}</span>
          {!isEdit
            ? ' · Sequence is assigned automatically.'
            : ` · Global #${semester?.sequence}`}
        </p>
        {isEdit ? (
          <div className='space-y-1.5'>
            <Label>Global sequence</Label>
            <Input value={String(semester?.sequence ?? '')} readOnly className='bg-muted' />
          </div>
        ) : null}
        <div className='space-y-1.5'>
          <Label htmlFor='semester-name'>Name (optional)</Label>
          <Input
            id='semester-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Auto: Semester N'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='semester-start'>
            Start date <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='semester-start'
            type='date'
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='semester-end'>
            End date <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='semester-end'
            type='date'
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </form>
    </PosFormModal>
  );
}
