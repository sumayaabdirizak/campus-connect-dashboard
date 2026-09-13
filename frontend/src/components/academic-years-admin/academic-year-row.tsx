'use client';

import { useState } from 'react';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/features/ui/components/collapsible';
import { AlertModal } from '@/features/modal/components/alert-modal';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { CalendarDays, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import {
  deleteAdminAcademicYear,
  deleteAdminSemester,
  type AdminAcademicYear,
  type AdminSemester
} from '@/lib/academic-years-admin/services';
import { formatDisplayDate } from '@/lib/academic-years-admin/services/format-dates';
import { SemesterFormSheet } from './semester-form-sheet';

function SemestersList({
  year,
  onAdd,
  onEdit
}: {
  year: AdminAcademicYear;
  onAdd: () => void;
  onEdit: (semester: AdminSemester) => void;
}) {
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

  if (semesters.length === 0) {
    return (
      <div className='rounded-md border border-dashed py-6 text-center'>
        <p className='text-muted-foreground text-sm'>No semesters yet.</p>
        <Button type='button' size='sm' variant='outline' className='mt-3' onClick={onAdd}>
          <Plus className='mr-1 size-3.5' /> Add semester
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className='mb-3 flex justify-end'>
        <Button type='button' size='sm' variant='outline' onClick={onAdd}>
          <Plus className='mr-1 size-3.5' /> Add semester
        </Button>
      </div>
      <div className='space-y-1'>
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

export function AcademicYearRow({ year }: { year: AdminAcademicYear }) {
  const [open, setOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<AdminSemester | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const deletion = useMutation({
    mutationFn: () => deleteAdminAcademicYear(year.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
      showToast('success', 'Academic year deleted');
      setDeleteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete academic year')
  });

  const semesterCount = year.semesters?.length ?? 0;
  const batchCount = year.batches?.length ?? 0;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className='rounded-lg border'>
          <div className='flex items-center justify-between gap-3 p-4'>
            <CollapsibleTrigger asChild>
              <button
                type='button'
                className='flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80'
              >
                {open ? <ChevronDown className='size-4' /> : <ChevronRight className='size-4' />}
                <div className='min-w-0'>
                  <p className='font-semibold'>{year.name}</p>
                  <p className='text-muted-foreground truncate text-sm'>
                    {formatDisplayDate(year.start_date)} – {formatDisplayDate(year.end_date)}
                  </p>
                  {year.activeSemester ? (
                    <p className='text-xs text-primary'>
                      Active now: Global #{year.activeSemester.sequence} (year slot{' '}
                      {year.yearSlot ?? 1})
                    </p>
                  ) : null}
                </div>
              </button>
            </CollapsibleTrigger>
            <div className='flex shrink-0 items-center gap-2'>
              {year.inActiveWindow ? (
                <Badge variant='default'>Active window</Badge>
              ) : (
                <Badge variant='outline'>History</Badge>
              )}
              <Badge variant='secondary'>
                <CalendarDays className='mr-1 size-3' />
                {semesterCount} sem
              </Badge>
              {batchCount > 0 ? <Badge variant='outline'>{batchCount} batches</Badge> : null}
              <Button
                type='button'
                size='sm'
                variant='ghost'
                className='text-destructive'
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
          <CollapsibleContent>
            <div className='border-t px-4 pb-4 pt-3'>
              <SemestersList
                year={year}
                onAdd={() => {
                  setEditingSemester(undefined);
                  setSemesterOpen(true);
                }}
                onEdit={(semester) => {
                  setEditingSemester(semester);
                  setSemesterOpen(true);
                }}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
      <SemesterFormSheet
        open={semesterOpen}
        onOpenChange={setSemesterOpen}
        yearId={year.id}
        yearName={year.name}
        semester={editingSemester}
      />
      <AlertModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deletion.mutate()}
        loading={deletion.isPending}
        title='Delete academic year?'
        description={`Delete ${year.name}? Remove batches and semesters first if deletion fails.`}
        confirmLabel='Delete'
      />
    </>
  );
}
