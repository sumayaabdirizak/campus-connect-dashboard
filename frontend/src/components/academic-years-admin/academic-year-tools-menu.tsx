'use client';

import { useState } from 'react';
import { ArrowUpCircle, CalendarRange, RotateCcw, Wrench } from 'lucide-react';
import { AlertModal } from '@/features/modal/components/alert-modal';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { adminBatchesQueryKey } from '@/lib/batches-admin/queries';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import {
  ensureSixAcademicYears,
  promoteAdminAcademicYear,
  resetSemestersCatalog
} from '@/lib/academic-years-admin/services';

export function AcademicYearToolsMenu() {
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [ensureOpen, setEnsureOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
    void queryClient.invalidateQueries({ queryKey: ['admin-semesters-flat'] });
    void queryClient.invalidateQueries({ queryKey: ['next-semester-numbers'] });
    void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
  };

  const promote = useMutation({
    mutationFn: promoteAdminAcademicYear,
    onSuccess: (data) => {
      invalidateAll();
      showToast('success', data.message ?? 'Academic year promoted');
      setPromoteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to promote academic year')
  });

  const ensure = useMutation({
    mutationFn: ensureSixAcademicYears,
    onSuccess: (data) => {
      invalidateAll();
      showToast('success', data.message ?? 'Active years ready');
      setEnsureOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to ensure 6 academic years')
  });

  const reset = useMutation({
    mutationFn: resetSemestersCatalog,
    onSuccess: (data) => {
      invalidateAll();
      showToast('success', data.message ?? `Reset to ${data.totalSemesters} semesters`);
      setResetOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to reset semesters')
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-9 rounded-full bg-card'
            aria-label='Year tools'
          >
            <Wrench className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-52'>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <RotateCcw className='mr-2 size-4' /> Reset to 12 semesters
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEnsureOpen(true)}>
            <CalendarRange className='mr-2 size-4' /> Ensure 6 active years
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPromoteOpen(true)}>
            <ArrowUpCircle className='mr-2 size-4' /> Promote year
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => reset.mutate()}
        loading={reset.isPending}
        title='Delete all semesters and recreate 12?'
        description='Removes every semester and rebuilds 6 academic years × 2 = 12 clean semesters.'
        confirmLabel='Delete & recreate'
      />
      <AlertModal
        isOpen={ensureOpen}
        onClose={() => setEnsureOpen(false)}
        onConfirm={() => ensure.mutate()}
        loading={ensure.isPending}
        title='Ensure 6 active academic years?'
        description='Keeps a rolling window of 6 years. Older years stay for history.'
        confirmLabel='Ensure'
      />
      <AlertModal
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onConfirm={() => promote.mutate()}
        loading={promote.isPending}
        title='Promote to next academic year?'
        description='Creates the next Sept–Aug year with the next global semester pair.'
        confirmLabel='Promote'
      />
    </>
  );
}
