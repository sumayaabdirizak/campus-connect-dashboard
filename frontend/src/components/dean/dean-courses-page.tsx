'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import PageContainer from '@/features/layout/components/page-container'
import { PosPageHeader } from '@/features/pos/components/pos-page-header'
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination'
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow,
  PosTableCell,
} from '@/features/pos/components/pos-table'
import { PosTableCard } from '@/features/pos/components/pos-table-card'
import { useQueryClient } from '@/lib/async-query'
import { useDeanCourses } from '@/lib/dean/queries'
import type { Course } from '@/lib/dean/types'

const COURSES_FETCH_LIMIT = '200'

function parseDeanCoursesResponse(raw: unknown): { courses: Course[]; total: number } {
  if (!raw || typeof raw !== 'object') {
    return { courses: [], total: 0 }
  }
  const obj = raw as Record<string, unknown>
  const courses = Array.isArray(obj.courses)
    ? (obj.courses as Course[])
    : Array.isArray(obj.results)
      ? (obj.results as Course[])
      : []
  const total =
    (typeof obj.totalCount === 'number' ? obj.totalCount : undefined) ??
    (typeof obj.count === 'number' ? obj.count : undefined) ??
    (typeof obj.total === 'number' ? obj.total : undefined) ??
    courses.length
  return { courses, total }
}

export function DeanCoursesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const deferredSearch = useDeferredValue(search.trim().toLowerCase())

  const { data, isLoading, error } = useDeanCourses({ limit: COURSES_FETCH_LIMIT })
  const { courses, total: apiTotal } = useMemo(() => parseDeanCoursesResponse(data), [data])

  const filtered = useMemo(() => {
    if (!deferredSearch) return courses
    return courses.filter(
      (course) =>
        course.code?.toLowerCase().includes(deferredSearch) ||
        course.name?.toLowerCase().includes(deferredSearch) ||
        course.department?.name?.toLowerCase().includes(deferredSearch)
    )
  }, [courses, deferredSearch])

  useEffect(() => {
    setPage(1)
  }, [deferredSearch])

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  return (
    <PageContainer fill scrollable={false}>
      <div className='grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4'>
        <PosPageHeader
          title='Courses'
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
                {courses.length < apiTotal ? ` (showing ${courses.length} — refresh if incomplete)` : ''}
              </p>
            ) : null}
            {filtered.length === 0 ? (
              <div className='p-10 text-center'>
                <p className='font-medium'>{deferredSearch ? 'No matches' : 'No courses yet'}</p>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {deferredSearch
                    ? 'Try a different search.'
                    : 'Courses in your faculty will appear here after university sync.'}
                </p>
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
                    </PosTableRow>
                  ))}
                </PosTableBody>
              </PosTable>
            )}
          </PosTableCard>
        )}
      </div>
    </PageContainer>
  )
}

export default DeanCoursesPage
