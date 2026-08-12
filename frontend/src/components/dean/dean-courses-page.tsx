'use client'

import PageContainer from '@/features/layout/components/page-container'
import { PosPageHeader } from '@/features/pos/components/pos-page-header'
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow,
  PosTableCell,
} from '@/components/pos/pos-table'
import { PosTableCard } from '@/components/pos/pos-table-card'
import { useQueryClient } from '@/lib/async-query'
import { useDeanCourses } from '@/lib/dean/queries'

export function DeanCoursesPage() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useDeanCourses()
  const courses = (data as { courses?: any[] } | undefined)?.courses ?? []

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Courses'
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['dean', 'courses'] })}
      />

      {isLoading ? (
        <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
          <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
        </div>
      ) : error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
          Failed to load courses: {(error as Error).message}
        </div>
      ) : (
        <PosTableCard>
          {courses.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='font-medium'>No courses yet</p>
              <p className='mt-1 text-sm text-muted-foreground'>
                Courses in your faculty will appear here.
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
                  <PosTableHeaderCell>Offerings</PosTableHeaderCell>
                  <PosTableHeaderCell>Teachers</PosTableHeaderCell>
                </tr>
              </PosTableHead>
              <PosTableBody>
                {courses.map((course) => (
                  <PosTableRow key={course.id}>
                    <PosTableCell>{course.code}</PosTableCell>
                    <PosTableCell>{course.name}</PosTableCell>
                    <PosTableCell>{course.department?.name ?? '—'}</PosTableCell>
                    <PosTableCell>{course.credits}</PosTableCell>
                    <PosTableCell>{course._count?.offerings ?? 0}</PosTableCell>
                    <PosTableCell>{course._count?.teacherAssignings ?? 0}</PosTableCell>
                  </PosTableRow>
                ))}
              </PosTableBody>
            </PosTable>
          )}
        </PosTableCard>
      )}
    </PageContainer>
  )
}

export default DeanCoursesPage
