'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
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
import { adminAcademicYearsQueryKey } from '@/lib/academic-years-admin/queries';
import {
  deleteAdminAcademicYear,
  type AdminAcademicYear,
  type AdminSemester
} from '@/lib/academic-years-admin/services';
import { AcademicYearSemestersDialog } from './academic-year-semesters-dialog';
import { SemesterFormSheet } from './semester-form-sheet';

export function AcademicYearRowActions({ year }: { year: AdminAcademicYear }) {
  const [semestersOpen, setSemestersOpen] = useState(false);
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<AdminSemester | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const deletion = useMutation({
    mutationFn: () => deleteAdminAcademicYear(year.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminAcademicYearsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['admin-semesters-flat'] });
      showToast('success', 'Academic year deleted');
      setDeleteOpen(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to delete academic year')
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type='button' variant='ghost' size='icon' className='size-8' aria-label='Actions'>
            <Icons.ellipsis className='size-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-44'>
          <DropdownMenuItem onClick={() => setSemestersOpen(true)}>View semesters</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setEditingSemester(undefined);
              setSemesterOpen(true);
            }}
          >
            Add semester
          </DropdownMenuItem>
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AcademicYearSemestersDialog
        year={year}
        open={semestersOpen}
        onOpenChange={setSemestersOpen}
        onAdd={() => {
          setEditingSemester(undefined);
          setSemesterOpen(true);
        }}
        onEdit={(semester) => {
          setEditingSemester(semester);
          setSemesterOpen(true);
        }}
      />
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
        description={`Delete ${year.name} and its history (semesters, batches, offerings, and registrations for this year)? This cannot be undone.`}
        confirmLabel='Delete'
      />
    </>
  );
}
