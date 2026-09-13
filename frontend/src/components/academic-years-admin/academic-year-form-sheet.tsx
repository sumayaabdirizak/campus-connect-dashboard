'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import { createAdminAcademicYear, fetchNextSemesterNumbers } from '@/lib/academic-years-admin/services';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function AcademicYearFormSheet({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: nextInfo } = useQuery({
    queryKey: ['next-semester-numbers'],
    queryFn: fetchNextSemesterNumbers,
    enabled: open
  });

  useEffect(() => {
    if (!open) return;
    setName('');
    setStartDate('');
    setEndDate('');
  }, [open]);

  const mutation = useMutation({
    mutationFn: createAdminAcademicYear,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['admin-semesters-flat'] });
      void queryClient.invalidateQueries({ queryKey: ['next-semester-numbers'] });
      const assigned = data.assignedSequences?.join(', #') ?? '';
      showToast(
        'success',
        assigned ? `Academic year created · Semester #${assigned}` : 'Academic year created'
      );
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to create academic year')
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      showToast('error', 'Fill in name and dates');
      return;
    }
    mutation.mutate({ name: name.trim(), start_date: startDate, end_date: endDate });
  };

  const nextA = nextInfo?.nextSequences?.[0];
  const nextB = nextInfo?.nextSequences?.[1];

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title='Create New Academic Year'
      formId='academic-year-form'
      submitLabel='Create New'
      submitting={mutation.isPending}
    >
      <form id='academic-year-form' onSubmit={submit} className='space-y-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='year-name'>
            Name <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='year-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='2026/2027'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='year-start'>
            Start date <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='year-start'
            type='date'
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='year-end'>
            End date <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='year-end'
            type='date'
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className='rounded-lg border border-border bg-muted px-3 py-2 text-sm'>
          <p className='font-semibold text-foreground'>Auto-assigned semesters</p>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            {nextA != null && nextB != null
              ? `This year gets Semester #${nextA} and #${nextB}.`
              : 'Loading next semester numbers…'}
          </p>
        </div>
      </form>
    </PosFormModal>
  );
}
