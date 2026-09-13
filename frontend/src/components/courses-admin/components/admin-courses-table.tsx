'use client';

import { Badge } from '@/components/ui/badge';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow,
  PosTableCell
} from '@/features/pos/components/pos-table';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { useAdminCourses } from '@/lib/courses-admin/queries';

export function AdminCoursesTable({
  facultyId,
  departmentId
}: {
  facultyId?: string;
  departmentId?: string;
} = {}) {
  const { data, isLoading, error } = useAdminCourses({
    departmentId,
    facultyId
  });
  const courses = data?.courses ?? [];

  if (isLoading) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load courses: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard>
      {courses.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>No courses yet</p>
          <p className='mt-1 text-sm text-muted-foreground'>
            {facultyId || departmentId
              ? 'No courses under this faculty / department.'
              : 'Browse all course templates here.'}
          </p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell>Code</PosTableHeaderCell>
              <PosTableHeaderCell>Name</PosTableHeaderCell>
              <PosTableHeaderCell>Department</PosTableHeaderCell>
              <PosTableHeaderCell>Credits</PosTableHeaderCell>
              <PosTableHeaderCell>Teachers</PosTableHeaderCell>
              <PosTableHeaderCell>Status</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {courses.map((course) => (
              <PosTableRow key={course.id}>
                <PosTableCell>{course.code}</PosTableCell>
                <PosTableCell>{course.name}</PosTableCell>
                <PosTableCell>{course.department?.name ?? '—'}</PosTableCell>
                <PosTableCell>{course.credits}</PosTableCell>
                <PosTableCell>{course._count?.teacherAssignings ?? 0}</PosTableCell>
                <PosTableCell>
                  <Badge variant={course.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {course.status ?? 'ACTIVE'}
                  </Badge>
                </PosTableCell>
              </PosTableRow>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}
