'use client';

import { useState } from 'react';
import { Button } from '@/features/ui/components/button';
import { AlertModal } from '@/features/modal/components/alert-modal';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { ArrowUpCircle, CalendarRange, Plus, RotateCcw } from 'lucide-react';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import {
  ensureSixAcademicYears,
  promoteAdminAcademicYear,
  resetSemestersCatalog
} from '@/lib/academic-years-admin/services';
import { adminBatchesQueryKey } from '@/lib/batches-admin/queries';
import { AcademicYearFormSheet } from './academic-year-form-sheet';

export function AcademicYearHeaderActions() {
  const [createOpen, setCreateOpen] = useState(false);
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
      showToast(
        'success',
        data.message ??
          `Active years ready: ${data.activeYears?.join(', ') ?? data.windowSize}`
      );
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
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' onClick={() => setResetOpen(true)}>
          <RotateCcw className='mr-2 size-4' />
          Reset to 12 semesters
        </Button>
        <Button type='button' variant='outline' onClick={() => setEnsureOpen(true)}>
          <CalendarRange className='mr-2 size-4' />
          Ensure 6 active years
        </Button>
        <Button type='button' variant='outline' onClick={() => setPromoteOpen(true)}>
          <ArrowUpCircle className='mr-2 size-4' />
          Promote year
        </Button>
        <Button type='button' onClick={() => setCreateOpen(true)}>
          <Plus className='mr-2 size-4' />
          New academic year
        </Button>
      </div>
      <AcademicYearFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      <AlertModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => reset.mutate()}
        loading={reset.isPending}
        title='Delete all semesters and recreate 12?'
        description='Removes every semester and rebuilds 6 academic years × 2 = 12 clean semesters (#1–#12). Also clears student registrations and course offerings that pointed at old semesters.'
        confirmLabel='Delete & recreate'
      />
      <AlertModal
        isOpen={ensureOpen}
        onClose={() => setEnsureOpen(false)}
        onConfirm={() => ensure.mutate()}
        loading={ensure.isPending}
        title='Ensure 6 active academic years?'
        description='Keeps a rolling window of 6 years (longest faculty duration). Each year gets 2 semesters automatically. Older years stay for history.'
        confirmLabel='Ensure'
      />
      <AlertModal
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onConfirm={() => promote.mutate()}
        loading={promote.isPending}
        title='Promote to next academic year?'
        description='Creates the next Sept–Aug year with the next global semester pair (+1). Syncs batches; completed cohorts → batch Inactive, students Graduated.'
        confirmLabel='Promote'
      />
    </>
  );
}
