'use client';

import { useState } from 'react';
import { Button } from '@/features/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { AlertModal } from '@/features/modal/components/alert-modal';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { Plus } from 'lucide-react';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import {
  deleteAdminSemester,
  type AdminAcademicYear,
  type AdminSemester
} from '@/lib/academic-years-admin/services';
import { formatDisplayDate } from '@/lib/academic-years-admin/services/format-dates';

type Props = {
  year: AdminAcademicYear;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onEdit: (semester: AdminSemester) => void;
};

export function AcademicYearSemestersDialog({
  year,
  open,
  onOpenChange,
  onAdd,
  onEdit
}: Props) {
  const semesters = [...(year.semesters ?? [])].sort((a, b) => a.sequence - b.sequence);
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deletion = useMutation({
    mutationFn: (semesterId: number) => deleteAdminSemester(year.id, semesterId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['admin-semesters-flat'] });
      showToast('success', 'Semester deleted');
      setDeleteId(null);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete semester')
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>Semesters — {year.name}</DialogTitle>
          </DialogHeader>
          <div className='mb-3 flex justify-end'>
            <Button type='button' size='sm' variant='outline' onClick={onAdd}>
              <Plus className='mr-1 size-3.5' /> Add semester
            </Button>
          </div>
          {semesters.length === 0 ? (
            <p className='text-muted-foreground py-6 text-center text-sm'>No semesters yet.</p>
          ) : (
            <div className='max-h-80 space-y-1 overflow-y-auto'>
              {semesters.map((semester) => (
                <div
                  key={semester.id}
                  className='bg-muted/40 flex items-center justify-between gap-3 rounded-md px-3 py-2'
                >
                  <div className='min-w-0'>
                    <p className='text-sm font-medium'>{semester.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      Global #{semester.sequence} · {formatDisplayDate(semester.start_date)} –{' '}
                      {formatDisplayDate(semester.end_date)}
                    </p>
                  </div>
                  <div className='flex shrink-0 gap-1'>
                    <Button type='button' size='sm' variant='ghost' onClick={() => onEdit(semester)}>
                      Edit
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      className='text-destructive'
                      onClick={() => setDeleteId(semester.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertModal
        isOpen={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && deletion.mutate(deleteId)}
        loading={deletion.isPending}
        title='Delete semester?'
        description='Registrations or course offerings linked to this semester may block deletion.'
        confirmLabel='Delete'
      />
    </>
  );
}
