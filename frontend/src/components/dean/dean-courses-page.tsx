'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow,
  PosTableCell
} from '@/features/pos/components/pos-table';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { Button } from '@/features/ui/components/button';
import { useQueryClient } from '@/lib/async-query';
import {
  DeanHierarchyFilters,
  defaultDeanHierarchyFilters,
  type DeanHierarchyFilterState
} from '@/components/dean/dean-hierarchy-filters';
import { DeanCourseFormSheet } from '@/components/dean/dean-course-form-sheet';
import { DeanAssignCourseSheet } from '@/components/dean/dean-assign-course-sheet';
import { useDeanCourses } from '@/lib/dean/queries';
import type { Course } from '@/lib/dean/types';

const COURSES_FETCH_LIMIT = '200';

function parseDeanCoursesResponse(raw: unknown): { courses: Course[]; total: number } {
  if (!raw || typeof raw !== 'object') {
    return { courses: [], total: 0 };
  }
  const obj = raw as Record<string, unknown>;
  const courses = Array.isArray(obj.courses)
    ? (obj.courses as Course[])
    : Array.isArray(obj.results)
      ? (obj.results as Course[])
      : [];
  const total =
    (typeof obj.totalCount === 'number' ? obj.totalCount : undefined) ??
    (typeof obj.count === 'number' ? obj.count : undefined) ??
    (typeof obj.total === 'number' ? obj.total : undefined) ??
    courses.length;
  return { courses, total };
}

export function DeanCoursesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<DeanHierarchyFilterState>(defaultDeanHierarchyFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignCourse, setAssignCourse] = useState<Course | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data, isLoading, error } = useDeanCourses({ limit: COURSES_FETCH_LIMIT });
  const { courses, total: apiTotal } = useMemo(() => parseDeanCoursesResponse(data), [data]);

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      if (filters.departmentId !== 'all') {
        const deptId = course.department?.id;
        if (String(deptId) !== filters.departmentId) return false;
      }
      if (!deferredSearch) return true;
      return (
        course.code?.toLowerCase().includes(deferredSearch) ||
        course.name?.toLowerCase().includes(deferredSearch) ||
        course.department?.name?.toLowerCase().includes(deferredSearch)
      );
    });
  }, [courses, deferredSearch, filters.departmentId]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, filters.departmentId]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <PageContainer fill scrollable={false}>
      <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4'>
        <PosPageHeader
          title='Courses'
          addLabel='Add Course'
          onAdd={() => setCreateOpen(true)}
          onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['dean', 'courses'] })}
        />

        {isLoading && !data ? (
          <div className='flex min-h-0 flex-1 items-center justify-center rounded-xl border bg-card'>
            <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          </div>
        ) : error ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
            Failed to load courses: {(error as Error).message}
          </div>
        ) : (
          <PosTableCard
            className='min-h-0 flex-1'
            bodyClassName='min-h-0 flex-1 overflow-y-auto overscroll-contain'
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search courses...'
            toolbarStart={
              <DeanHierarchyFilters filters={filters} onChange={setFilters} />
            }
            footer={
              filtered.length > 0 ? (
                <PosTablePagination
                  page={page}
                  pageSize={pageSize}
                  total={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemLabel='courses'
                />
              ) : null
            }
          >
            {apiTotal > 0 ? (
              <p className='px-4 pt-3 text-sm text-muted-foreground'>
                {apiTotal} courses loaded
                {courses.length < apiTotal
                  ? ` (showing ${courses.length} — refresh if incomplete)`
                  : ''}
              </p>
            ) : null}
            {filtered.length === 0 ? (
              <div className='p-10 text-center'>
                <p className='font-medium'>{deferredSearch ? 'No matches' : 'No courses yet'}</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {deferredSearch
                    ? 'Try a different search.'
                    : 'Use Add Course to create a catalogue course, then assign it to a batch section.'}
                </p>
                {!deferredSearch ? (
                  <Button className='mt-4' type='button' onClick={() => setCreateOpen(true)}>
                    Add Course
                  </Button>
                ) : null}
              </div>
            ) : (
              <PosTable>
                <PosTableHead className='sticky top-0 z-10 shadow-[inset_0_-1px_0_0_var(--border)]'>
                  <tr>
                    <PosTableHeaderCell>Code</PosTableHeaderCell>
                    <PosTableHeaderCell>Name</PosTableHeaderCell>
                    <PosTableHeaderCell>Department</PosTableHeaderCell>
                    <PosTableHeaderCell>Credits</PosTableHeaderCell>
                    <PosTableHeaderCell>Offerings</PosTableHeaderCell>
                    <PosTableHeaderCell>Teachers</PosTableHeaderCell>
                    <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
                  </tr>
                </PosTableHead>
                <PosTableBody>
                  {pageRows.map((course) => (
                    <PosTableRow key={course.id}>
                      <PosTableCell>{course.code}</PosTableCell>
                      <PosTableCell>{course.name}</PosTableCell>
                      <PosTableCell>{course.department?.name ?? '—'}</PosTableCell>
                      <PosTableCell>{course.credits}</PosTableCell>
                      <PosTableCell>{course._count?.offerings ?? 0}</PosTableCell>
                      <PosTableCell>{course._count?.teacherAssignings ?? 0}</PosTableCell>
                      <PosTableCell align='right'>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          className='h-8'
                          onClick={() => setAssignCourse(course)}
                        >
                          Assign to batch
                        </Button>
                      </PosTableCell>
                    </PosTableRow>
                  ))}
                </PosTableBody>
              </PosTable>
            )}
          </PosTableCard>
        )}
      </div>

      <DeanCourseFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultDepartmentId={filters.departmentId}
        onCreated={(course) => {
          setAssignCourse({
            id: course.id,
            name: course.name,
            code: course.code,
            credits: 3,
            department: course.department
              ? {
                  id: course.department.id,
                  name: course.department.name,
                  code: course.department.code
                }
              : { id: 0, name: '—', code: '—' },
            _count: { offerings: 0, teacherAssignings: 0 }
          });
        }}
      />
      <DeanAssignCourseSheet
        open={assignCourse != null}
        onOpenChange={(open) => {
          if (!open) setAssignCourse(null);
        }}
        course={assignCourse}
      />
    </PageContainer>
  );
}

export default DeanCoursesPage;
