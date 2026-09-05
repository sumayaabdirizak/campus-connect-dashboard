'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import {
  PosTable,
  PosTableBody,
  PosTableCell,
  PosTableHead,
  PosTableHeaderCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import {
  BODY,
  CARD,
  KPI_LABEL,
  KPI_TILE,
  KPI_VALUE,
  META,
  PAGE_BG,
  SUBTITLE,
  TITLE_LG,
  TITLE_MD
} from '@/components/reports/report-theme';
import { exportCourseReportPdf } from '@/components/reports/course-reports/export-course-report';
import {
  useCourseReportDetail,
  useCourseReportsList
} from '@/lib/teacher-courses/queries';
import type { CourseReportListRow } from '@/lib/teacher-courses/course-report-types';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}%`;
}

function matchesSearch(row: CourseReportListRow, q: string): boolean {
  if (!q) return true;
  const hay = [
    row.courseCode,
    row.courseName,
    row.section,
    row.batch,
    row.department
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
}

function CourseReportsTable({
  onOpen
}: {
  onOpen: (id: string) => void;
}) {
  const { data, isLoading, isFetching, error, refetch } = useCourseReportsList(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortId, setSortId] = useState('courseCode-asc');

  const filtered = useMemo(() => {
    const rows = (data?.rows ?? []).filter((r) => matchesSearch(r, search.trim()));
    const [key, dir] = sortId.split('-') as [string, 'asc' | 'desc'];
    const mult = dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * mult;
      return String(av ?? '').localeCompare(String(bv ?? '')) * mult;
    });
  }, [data?.rows, search, sortId]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className={TITLE_LG}>Course reports</h1>
          <p className={SUBTITLE}>
            Browse your courses, then open one for quizzes, assignments, resources, and failed
            students.
          </p>
        </div>
        <Button
          size='sm'
          variant='outline'
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn('mr-1.5 size-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load courses: {error.message}
        </div>
      ) : null}

      <PosTableCard
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder='Filter by course, section, batch…'
        sortOptions={[
          { id: 'courseCode-asc', label: 'Course code A–Z' },
          { id: 'courseCode-desc', label: 'Course code Z–A' },
          { id: 'failed-desc', label: 'Failed (high first)' },
          { id: 'failed-asc', label: 'Failed (low first)' },
          { id: 'students-desc', label: 'Students (high first)' },
          { id: 'quizzes-desc', label: 'Quizzes (high first)' },
          { id: 'assignments-desc', label: 'Assignments (high first)' }
        ]}
        sortId={sortId}
        onSortChange={(id) => {
          setSortId(id);
          setPage(1);
        }}
        footer={
          filtered.length > 0 ? (
            <PosTablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              itemLabel={filtered.length === 1 ? 'course' : 'courses'}
            />
          ) : null
        }
      >
        <div className={isLoading || isFetching ? 'opacity-60 transition-opacity' : undefined}>
          {isLoading && !data ? (
            <div className='space-y-2 p-4'>
              <div className='h-10 animate-pulse rounded bg-muted/60' />
              <div className='h-10 animate-pulse rounded bg-muted/60' />
              <div className='h-10 animate-pulse rounded bg-muted/60' />
            </div>
          ) : pageRows.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='font-medium'>
                {(data?.rows.length ?? 0) === 0 ? 'No courses assigned' : 'No matches'}
              </p>
              <p className={cn(BODY, 'mt-1')}>
                {(data?.rows.length ?? 0) === 0
                  ? 'When you have an active course offering, it will appear here.'
                  : 'Try a different search.'}
              </p>
            </div>
          ) : (
            <PosTable>
              <PosTableHead>
                <tr>
                  <PosTableHeaderCell>Course</PosTableHeaderCell>
                  <PosTableHeaderCell>Section</PosTableHeaderCell>
                  <PosTableHeaderCell>Batch</PosTableHeaderCell>
                  <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
                  <PosTableHeaderCell className='text-right'>Quizzes</PosTableHeaderCell>
                  <PosTableHeaderCell className='text-right'>Assignments</PosTableHeaderCell>
                  <PosTableHeaderCell className='text-right'>Resources</PosTableHeaderCell>
                  <PosTableHeaderCell className='text-right'>Failed</PosTableHeaderCell>
                  <PosTableHeaderCell className='text-right'>Avg</PosTableHeaderCell>
                </tr>
              </PosTableHead>
              <PosTableBody>
                {pageRows.map((row) => (
                  <PosTableRow
                    key={row.id}
                    className='cursor-pointer'
                    onClick={() => onOpen(row.id)}
                  >
                    <PosTableCell>
                      <div className='min-w-0'>
                        <p className='font-medium text-foreground'>
                          {row.courseCode} — {row.courseName}
                        </p>
                        {row.department ? (
                          <p className='text-xs text-muted-foreground'>{row.department}</p>
                        ) : null}
                      </div>
                    </PosTableCell>
                    <PosTableCell>{row.section}</PosTableCell>
                    <PosTableCell>{row.batch ?? '—'}</PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>{row.students}</PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>{row.quizzes}</PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>
                      {row.assignments}
                    </PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>{row.resources}</PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>
                      <span
                        className={cn(
                          row.failed > 0 && 'font-semibold text-amber-700 dark:text-amber-400'
                        )}
                      >
                        {row.failed}
                      </span>
                    </PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>
                      {pct(row.avgOverallPct)}
                    </PosTableCell>
                  </PosTableRow>
                ))}
              </PosTableBody>
            </PosTable>
          )}
        </div>
      </PosTableCard>
    </div>
  );
}

function ContentList({
  title,
  empty,
  items
}: {
  title: string;
  empty: string;
  items: { id: number; title: string; meta?: string }[];
}) {
  return (
    <div className={cn(CARD, 'p-4')}>
      <p className={TITLE_MD}>{title}</p>
      <p className={cn(META, 'mb-3')}>{items.length} posted</p>
      {items.length === 0 ? (
        <p className={BODY}>{empty}</p>
      ) : (
        <ul className='divide-y divide-border'>
          {items.map((item) => (
            <li key={item.id} className='flex items-center justify-between gap-2 py-2 text-sm'>
              <span className='truncate font-medium text-foreground'>{item.title}</span>
              {item.meta ? <span className='shrink-0 text-muted-foreground'>{item.meta}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CourseReportDetailView({
  offeringId,
  onBack
}: {
  offeringId: string;
  onBack: () => void;
}) {
  const { data, isLoading, isFetching, error, refetch } = useCourseReportDetail(
    offeringId,
    true
  );

  const handleExport = () => {
    if (!data) return;
    exportCourseReportPdf(data);
    showToast('success', 'Print dialog opened — choose Save as PDF');
  };

  const kpis = data
    ? [
        { label: 'Quizzes', value: data.content.quizzes },
        { label: 'Assignments', value: data.content.assignments },
        { label: 'Resources', value: data.content.resources },
        { label: 'Students', value: data.classSummary.studentCount },
        { label: 'Avg score', value: pct(data.classSummary.avgOverallPct) },
        { label: 'Failed', value: data.classSummary.failedCount }
      ]
    : [];

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 space-y-2'>
          <Button size='sm' variant='ghost' className='-ml-2 h-8 px-2' onClick={onBack}>
            <ArrowLeft className='mr-1.5 size-4' />
            All courses
          </Button>
          {data ? (
            <>
              <h1 className={TITLE_LG}>
                {data.course.courseCode} — {data.course.courseName}
              </h1>
              <p className={SUBTITLE}>
                {data.course.section}
                {data.course.batch ? ` · ${data.course.batch}` : ''}
                {data.course.department ? ` · ${data.course.department}` : ''}
              </p>
            </>
          ) : (
            <h1 className={TITLE_LG}>Course report</h1>
          )}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {data ? (
            <Button size='sm' variant='outline' asChild>
              <Link href={`/dashboard/courses/${data.course.id}`}>Open course</Link>
            </Button>
          ) : null}
          <Button size='sm' variant='outline' onClick={handleExport} disabled={!data}>
            <Download className='mr-1.5 size-4' />
            Export PDF
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('mr-1.5 size-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load this course report: {error.message}
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-20 animate-pulse rounded-xl bg-muted/60' />
          ))}
        </div>
      ) : null}

      {data ? (
        <>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6'>
            {kpis.map((k) => (
              <div key={k.label} className={cn(CARD, 'p-4')}>
                <div className={cn('mb-2 inline-flex rounded-lg px-2 py-1', KPI_TILE)}>
                  <span className={KPI_LABEL}>{k.label}</span>
                </div>
                <p className={KPI_VALUE}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <ContentList
              title='Quizzes'
              empty='No quizzes published.'
              items={data.content.quizItems.map((i) => ({ id: i.id, title: i.title }))}
            />
            <ContentList
              title='Assignments'
              empty='No assignments published.'
              items={data.content.assignmentItems.map((i) => ({ id: i.id, title: i.title }))}
            />
            <ContentList
              title='Resources'
              empty='No resources published.'
              items={data.content.resourceItems.map((i) => ({
                id: i.id,
                title: i.title,
                meta: i.type
              }))}
            />
          </div>

          <div className={cn(CARD, 'overflow-hidden')}>
            <div className='border-b border-border px-4 py-3'>
              <p className={TITLE_MD}>Failed students</p>
              <p className={META}>Overall average below 60%</p>
            </div>
            {data.failedStudents.length === 0 ? (
              <p className={cn(BODY, 'px-4 py-8 text-center')}>No failed students in this course.</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[420px] text-left text-sm'>
                  <thead>
                    <tr className='border-b border-border bg-muted/50 text-xs text-muted-foreground'>
                      <th className='px-4 py-2.5 font-medium'>Student</th>
                      <th className='px-4 py-2.5 font-medium'>ID</th>
                      <th className='px-4 py-2.5 text-right font-medium'>Overall %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failedStudents.map((s) => (
                      <tr key={s.studentId} className='border-b border-border last:border-0'>
                        <td className='px-4 py-2.5 font-medium'>{s.name}</td>
                        <td className='px-4 py-2.5 text-muted-foreground'>{s.number ?? '—'}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-400'>
                          {pct(s.overallPct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={cn(CARD, 'overflow-hidden')}>
            <div className='border-b border-border px-4 py-3'>
              <p className={TITLE_MD}>All students</p>
              <p className={META}>
                {data.classSummary.passedCount} passed · {data.classSummary.failedCount} failed ·{' '}
                {data.classSummary.ungradedCount} no grades
              </p>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[480px] text-left text-sm'>
                <thead>
                  <tr className='border-b border-border bg-muted/50 text-xs text-muted-foreground'>
                    <th className='px-4 py-2.5 font-medium'>Student</th>
                    <th className='px-4 py-2.5 font-medium'>ID</th>
                    <th className='px-4 py-2.5 text-right font-medium'>Overall %</th>
                    <th className='px-4 py-2.5 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.studentId} className='border-b border-border last:border-0'>
                      <td className='px-4 py-2.5 font-medium'>{s.name}</td>
                      <td className='px-4 py-2.5 text-muted-foreground'>{s.number ?? '—'}</td>
                      <td className='px-4 py-2.5 text-right tabular-nums'>{pct(s.overallPct)}</td>
                      <td className='px-4 py-2.5'>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            s.status === 'Failed' && 'text-amber-700 dark:text-amber-400',
                            s.status === 'Passed' && 'text-emerald-700 dark:text-emerald-400',
                            s.status === 'No grades' && 'text-muted-foreground'
                          )}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CourseReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('course') ?? '';

  const openCourse = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('course', id);
    router.push(`${pathname}?${next.toString()}`);
  };

  const backToList = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('course');
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  return (
    <div className={cn(PAGE_BG, 'pb-6')}>
      {courseId ? (
        <CourseReportDetailView offeringId={courseId} onBack={backToList} />
      ) : (
        <CourseReportsTable onOpen={openCourse} />
      )}
    </div>
  );
}
