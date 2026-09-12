'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Badge } from '@/components/ui/badge';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow,
  PosTableCell
} from '@/components/pos/pos-table';
import { PosTableCard } from '@/components/pos/pos-table-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useQueryClient } from '@/lib/async-query';
import { AcademicScopeBreadcrumb } from '@/components/academic/academic-scope-breadcrumb';
import { AcademicWorkflowSteps } from '@/components/academic/academic-workflow-steps';
import { AcademicScopeFilters } from '@/components/academic/academic-scope-filters';
import { useAcademicScope } from '@/lib/academic-scope/use-academic-scope';
import { useAdminCourses } from '@/lib/courses-admin/queries';

export function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const { scope } = useAcademicScope();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data, isLoading, error } = useAdminCourses({
    departmentId: scope.departmentId || undefined,
    facultyId: scope.facultyId || undefined
  });
  const courses = data?.courses ?? [];

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      if (status !== 'all' && (course.status ?? 'ACTIVE') !== status) return false;
      if (!deferredSearch) return true;
      const hay = [course.code, course.name, course.department?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(deferredSearch);
    });
  }, [courses, deferredSearch, status]);

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Courses'
        onRefresh={() =>
          void queryClient.invalidateQueries({ queryKey: ['courses-admin'] })
        }
      />

      <AcademicWorkflowSteps scope={scope} active='courses' />
      <AcademicScopeBreadcrumb scope={scope} current='courses' />

      {isLoading ? (
        <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
          <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
        </div>
      ) : error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
          Failed to load courses: {(error as Error).message}
        </div>
      ) : (
        <PosTableCard
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder='Search courses...'
          toolbarStart={
            <div className='flex flex-wrap items-center gap-2'>
              <AcademicScopeFilters showProgram={false} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className='h-9 w-auto min-w-[8rem] text-xs'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All statuses</SelectItem>
                  <SelectItem value='ACTIVE'>Active</SelectItem>
                  <SelectItem value='INACTIVE'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          {filtered.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='font-medium'>
                {courses.length === 0 ? 'No courses yet' : 'No matches'}
              </p>
              <p className='mt-1 text-sm text-muted-foreground'>
                {courses.length === 0
                  ? scope.facultyId || scope.departmentId
                    ? 'No courses under this faculty / department.'
                    : 'Open a department from Departments to see its courses, or browse all here.'
                  : 'Try a different search or filter.'}
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
                {filtered.map((course) => (
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
      )}
    </PageContainer>
  );
}
