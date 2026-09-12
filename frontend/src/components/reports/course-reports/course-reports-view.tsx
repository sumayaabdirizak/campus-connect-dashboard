'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { PosTablePagination } from '@/features/pos/components/pos-table-pagination';
import { useDebounce } from '@/hooks/use-debounce';
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
import {
  GlobalFilterField,
  GlobalReportFilters,
  GLOBAL_FILTER_CONTROL
} from '@/components/reports/global-report-filters';
import { ReportCustomDateFields } from '@/components/reports/report-custom-date-fields';
import { SearchSelect } from '@/components/ui/search-select';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import {
  exportCourseReportCsv,
  exportCourseReportExcel,
  exportCourseReportPdf,
  exportCourseReportWord,
  exportCourseReportsListCsv,
  exportCourseReportsListExcel,
  exportCourseReportsListPdf,
  exportCourseReportsListWord,
  exportStudentCourseReportPdf
} from '@/components/reports/course-reports/export-course-report';
import {
  useCourseReportDetail,
  useCourseReportsList
} from '@/lib/teacher-courses/queries';
import { getCourseReportDetail, getCourseReportsList } from '@/lib/teacher-courses/services';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';
import { courseOfferingPath } from '@/lib/course-offering-href';

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}%`;
}

function marksLabel(
  n: number | null | undefined,
  max?: number | null
): string {
  if (n == null || Number.isNaN(n)) return '—';
  const value = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return max != null && max > 0 ? `${value}/${max}` : value;
}

function reportStatusClass(status: string): string {
  if (status === 'Failed') return 'text-amber-700 dark:text-amber-400';
  if (status === 'Passed') return 'text-emerald-700 dark:text-emerald-400';
  if (status === 'Missing') return 'text-rose-700 dark:text-rose-400';
  if (status === 'No grade') return 'text-sky-700 dark:text-sky-400';
  return 'text-muted-foreground';
}

type CourseReportFilters = {
  department: string;
  courseId: string;
  period: string;
  from: string | null;
  to: string | null;
};

const defaultCourseFilters: CourseReportFilters = {
  department: 'all',
  courseId: 'all',
  period: 'semester',
  from: null,
  to: null
};

const COURSE_FILTER_STORAGE = 'course-reports-filters:v3';

function CourseReportsTable({
  onOpen
}: {
  onOpen: (id: string) => void;
}) {
  const { data: semesterWindow } = useActiveSemesterWindow();
  const [draftFilters, setDraftFilters] = useState<CourseReportFilters>(defaultCourseFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<CourseReportFilters>(defaultCourseFilters);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortId, setSortId] = useState('courseCode-asc');

  const dateParams = useMemo(() => {
    if (appliedFilters.period === 'custom') {
      return { from: appliedFilters.from, to: appliedFilters.to };
    }
    if (appliedFilters.period === 'semester') {
      return {
        from: semesterWindow?.minDate ?? null,
        to: semesterWindow?.maxDate ?? null
      };
    }
    return { from: null, to: null };
  }, [appliedFilters, semesterWindow?.minDate, semesterWindow?.maxDate]);

  const listEnabled =
    appliedFilters.period === 'all' ||
    (!!dateParams.from && !!dateParams.to);

  const listParams = useMemo(
    () => ({
      ...dateParams,
      page,
      pageSize,
      q: debouncedSearch || undefined,
      department: appliedFilters.department,
      courseId: appliedFilters.courseId,
      sort: sortId
    }),
    [dateParams, page, pageSize, debouncedSearch, appliedFilters, sortId]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useCourseReportsList(
    listEnabled,
    listParams
  );
  const waitingForSemester =
    appliedFilters.period === 'semester' &&
    (!dateParams.from || !dateParams.to);
  const showInitialLoading = waitingForSemester || (listEnabled && isLoading && !data);
  const showUpdating = isFetching && !showInitialLoading;

  const pageRows = data?.rows ?? [];
  const total = data?.total ?? data?.totalCount ?? pageRows.length;

  const departments = data?.filterOptions?.departments ?? [];

  const courseOptions = useMemo(() => {
    const courses = (data?.filterOptions?.courses ?? []).filter((c) => {
      if (draftFilters.department === 'all') return true;
      return (c.department ?? '').trim() === draftFilters.department;
    });
    return [
      { value: 'all', label: 'All courses' },
      ...courses.map((c) => ({
        value: c.id,
        label: c.label,
        sub: [c.section, c.batch, c.department].filter(Boolean).join(' · ')
      }))
    ];
  }, [data?.filterOptions?.courses, draftFilters.department]);

  const detailOfferingId =
    appliedFilters.courseId !== 'all'
      ? appliedFilters.courseId
      : total === 1 && pageRows.length === 1
        ? pageRows[0].id
        : null;

  const detailCourseLabel = detailOfferingId
    ? pageRows.find((r) => r.id === detailOfferingId)?.courseCode ??
      data?.filterOptions?.courses?.find((c) => c.id === detailOfferingId)?.label ??
      'course'
    : null;

  const [exportingDetail, setExportingDetail] = useState(false);
  const [exportingList, setExportingList] = useState(false);

  const handlePeriodChange = (v: string) => {
    if (v === 'custom') {
      setDraftFilters((p) => ({
        ...p,
        period: 'custom',
        from: p.from ?? semesterWindow?.minDate ?? null,
        to: p.to ?? semesterWindow?.maxDate ?? null
      }));
      return;
    }
    setDraftFilters((p) => ({ ...p, period: v, from: null, to: null }));
  };

  const exportList = async (format: 'pdf' | 'excel' | 'csv' | 'word') => {
    setExportingList(true);
    try {
      const all = await getCourseReportsList({
        ...listParams,
        page: 1,
        pageSize: 1000
      });
      const rows = all.rows ?? [];
      if (format === 'pdf') {
        exportCourseReportsListPdf(rows);
        showToast('success', 'Print dialog opened — choose Save as PDF');
      } else if (format === 'excel') {
        exportCourseReportsListExcel(rows);
        showToast('success', 'Excel list downloaded');
      } else if (format === 'csv') {
        exportCourseReportsListCsv(rows);
        showToast('success', 'CSV list downloaded');
      } else {
        exportCourseReportsListWord(rows);
        showToast('success', 'Word list downloaded');
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not export list');
    } finally {
      setExportingList(false);
    }
  };

  const exportDetailedCourse = async (format: 'pdf' | 'excel' | 'csv' | 'word') => {
    if (!detailOfferingId) {
      showToast('error', 'Select one course under Courses, then Apply filters');
      return;
    }
    setExportingDetail(true);
    try {
      const report = await getCourseReportDetail(detailOfferingId);
      if (format === 'pdf') {
        exportCourseReportPdf(report);
        showToast('success', 'Print dialog opened — choose Save as PDF');
      } else if (format === 'excel') {
        exportCourseReportExcel(report);
        showToast('success', 'Detailed Excel report downloaded');
      } else if (format === 'csv') {
        exportCourseReportCsv(report);
        showToast('success', 'Detailed CSV report downloaded');
      } else {
        exportCourseReportWord(report);
        showToast('success', 'Detailed Word report downloaded');
      }
    } catch (e) {
      showToast(
        'error',
        e instanceof Error ? e.message : 'Could not export detailed course report'
      );
    } finally {
      setExportingDetail(false);
    }
  };

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
        <div className='flex flex-wrap items-center gap-2'>
          {showUpdating ? (
            <span className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
              <RefreshCw className='size-3.5 animate-spin' />
              Updating…
            </span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                disabled={total === 0 || exportingDetail || exportingList}
              >
                <Download className='mr-1.5 size-4' />
                {exportingDetail || exportingList
                  ? 'Exporting…'
                  : detailOfferingId
                    ? 'Export detail'
                    : 'Export list'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='min-w-[220px]'>
              <DropdownMenuLabel>
                {detailOfferingId
                  ? `Detailed report · ${detailCourseLabel}`
                  : 'Select a course to export detail'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!detailOfferingId || exportingDetail}
                onClick={() => void exportDetailedCourse('pdf')}
              >
                <FileText className='mr-2 size-4' /> PDF — Full detail
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!detailOfferingId || exportingDetail}
                onClick={() => void exportDetailedCourse('excel')}
              >
                <FileSpreadsheet className='mr-2 size-4' /> Excel — Full detail
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!detailOfferingId || exportingDetail}
                onClick={() => void exportDetailedCourse('csv')}
              >
                <Download className='mr-2 size-4' /> CSV — Full detail
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!detailOfferingId || exportingDetail}
                onClick={() => void exportDetailedCourse('word')}
              >
                <FileText className='mr-2 size-4' /> Word — Full detail
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>List summary ({total})</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('pdf')}
              >
                <FileText className='mr-2 size-4' /> PDF — List
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('excel')}
              >
                <FileSpreadsheet className='mr-2 size-4' /> Excel — List
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('csv')}
              >
                <Download className='mr-2 size-4' /> CSV — List
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('word')}
              >
                <FileText className='mr-2 size-4' /> Word — List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <GlobalReportFilters
        description='Filter by department, course, and date — then apply.'
        storageKey={COURSE_FILTER_STORAGE}
        getTemplate={() => draftFilters}
        onLoadTemplate={(raw) => {
          if (!raw || typeof raw !== 'object') return;
          const o = raw as Partial<CourseReportFilters>;
          setDraftFilters({
            department: typeof o.department === 'string' ? o.department : 'all',
            courseId: typeof o.courseId === 'string' ? o.courseId : 'all',
            period: typeof o.period === 'string' ? o.period : 'semester',
            from: typeof o.from === 'string' ? o.from : null,
            to: typeof o.to === 'string' ? o.to : null
          });
        }}
        onApply={() => {
          setAppliedFilters(draftFilters);
          setPage(1);
        }}
        onReset={() => {
          setDraftFilters(defaultCourseFilters);
          setAppliedFilters(defaultCourseFilters);
          setPage(1);
        }}
      >
        <GlobalFilterField label='Department'>
          <SearchSelect
            options={[
              { value: 'all', label: 'All departments' },
              ...departments.map((d) => ({ value: d, label: d }))
            ]}
            value={draftFilters.department}
            onValueChange={(v) =>
              setDraftFilters((p) => {
                const stillValid =
                  p.courseId === 'all' ||
                  (data?.filterOptions?.courses ?? []).some(
                    (c) =>
                      c.id === p.courseId &&
                      (v === 'all' || (c.department ?? '').trim() === v)
                  );
                return {
                  ...p,
                  department: v,
                  courseId: stillValid ? p.courseId : 'all'
                };
              })
            }
            placeholder='Department'
            searchPlaceholder='Search departments…'
            emptyText='No departments found.'
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>

        <GlobalFilterField label='Courses'>
          <SearchSelect
            options={courseOptions}
            value={draftFilters.courseId}
            onValueChange={(v) => setDraftFilters((p) => ({ ...p, courseId: v }))}
            placeholder='Select course'
            searchPlaceholder='Search courses…'
            emptyText='No courses found.'
            loading={showInitialLoading}
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>

        <GlobalFilterField label='Period'>
          <Select value={draftFilters.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className={cn('w-full', GLOBAL_FILTER_CONTROL)}>
              <SelectValue placeholder='Period' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All time</SelectItem>
              <SelectItem value='semester'>Current semester</SelectItem>
              <SelectItem value='custom'>Custom dates</SelectItem>
            </SelectContent>
          </Select>
        </GlobalFilterField>

        {draftFilters.period === 'custom' ? (
          <ReportCustomDateFields
            from={draftFilters.from}
            to={draftFilters.to}
            minDate={semesterWindow?.minDate ?? null}
            maxDate={semesterWindow?.maxDate ?? null}
            onChange={(patch) => setDraftFilters((p) => ({ ...p, ...patch }))}
            hint={
              semesterWindow?.label
                ? `Limited to ${semesterWindow.label} (semester start through today).`
                : 'Limited to the active semester start through today.'
            }
          />
        ) : null}
      </GlobalReportFilters>

      {isError ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load courses: {error?.message}
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
          total > 0 ? (
            <PosTablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              itemLabel={total === 1 ? 'course' : 'courses'}
            />
          ) : null
        }
      >
        <div>
          {showInitialLoading ? (
            <div className='space-y-2 p-4'>
              <div className='h-10 animate-pulse rounded bg-muted/60' />
              <div className='h-10 animate-pulse rounded bg-muted/60' />
              <div className='h-10 animate-pulse rounded bg-muted/60' />
            </div>
          ) : pageRows.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='font-medium'>
                {total === 0 ? 'No courses assigned' : 'No matches'}
              </p>
              <p className={cn(BODY, 'mt-1')}>
                {total === 0
                  ? 'When you have an active course offering, it will appear here.'
                  : 'Try different filters or search.'}
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
                  <PosTableHeaderCell className='text-right'>Avg marks</PosTableHeaderCell>
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
                      {marksLabel(row.avgOverallMarks ?? row.avgOverallPct, row.courseMaxMarks)}
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
  const { data, isLoading, isFetching, isError, error, refetch } = useCourseReportDetail(
    offeringId,
    true
  );
  const showUpdating = isFetching && !!data;

  const handleExport = (format: 'pdf' | 'excel' | 'csv' | 'word') => {
    if (!data) return;
    if (format === 'pdf') {
      exportCourseReportPdf(data);
      showToast('success', 'Print dialog opened — choose Save as PDF');
      return;
    }
    if (format === 'excel') {
      exportCourseReportExcel(data);
      showToast('success', 'Excel report downloaded');
      return;
    }
    if (format === 'csv') {
      exportCourseReportCsv(data);
      showToast('success', 'CSV report downloaded');
      return;
    }
    exportCourseReportWord(data);
    showToast('success', 'Word report downloaded');
  };

  const kpis = data
    ? [
        { label: 'Quizzes', value: data.content.quizzes },
        { label: 'Assignments', value: data.content.assignments },
        { label: 'Resources', value: data.content.resources },
        { label: 'Students', value: data.classSummary.studentCount },
        {
          label: 'Avg marks',
          value: marksLabel(
            data.classSummary.avgOverallMarks ?? data.classSummary.avgOverallPct,
            data.classSummary.courseMaxMarks
          )
        },
        { label: 'Failed', value: data.classSummary.failedCount },
        { label: 'Missing', value: data.classSummary.missingCount ?? 0 },
        { label: 'No grade', value: data.classSummary.noGradeCount ?? 0 },
        {
          label: 'Not submitted',
          value: data.classSummary.notSubmittedCount ?? 0
        }
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
          {showUpdating ? (
            <span className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
              <RefreshCw className='size-3.5 animate-spin' />
              Updating…
            </span>
          ) : null}
          {data ? (
            <Button size='sm' variant='outline' asChild>
              <a href={courseOfferingPath(data.course.id)}>Open course</a>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='sm' variant='outline' disabled={!data}>
                <Download className='mr-1.5 size-4' />
                Export detail
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Export detailed report</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className='mr-2 size-4' /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className='mr-2 size-4' /> Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <Download className='mr-2 size-4' /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')}>
                <FileText className='mr-2 size-4' /> Word (.doc)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {isError ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load this course report: {error?.message}
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
              <p className={META}>Overall marks below 60% of course max</p>
            </div>
            {data.failedStudents.length === 0 ? (
              <p className={cn(BODY, 'px-4 py-8 text-center')}>No failed students in this course.</p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[480px] text-left text-sm'>
                  <thead>
                    <tr className='border-b border-border bg-muted/50 text-xs text-muted-foreground'>
                      <th className='px-4 py-2.5 font-medium'>Student</th>
                      <th className='px-4 py-2.5 font-medium'>ID</th>
                      <th className='px-4 py-2.5 text-right font-medium'>Overall marks</th>
                      <th className='px-4 py-2.5 font-medium'>Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.failedStudents.map((s) => (
                      <tr key={s.studentId} className='border-b border-border last:border-0'>
                        <td className='px-4 py-2.5 font-medium'>{s.name}</td>
                        <td className='px-4 py-2.5 text-muted-foreground'>{s.number ?? '—'}</td>
                        <td className='px-4 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-400'>
                          {marksLabel(
                            s.overallMarks ?? s.overallPct,
                            data.classSummary.courseMaxMarks
                          )}
                        </td>
                        <td className='px-4 py-2.5'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-7 px-2 text-xs'
                            onClick={() => {
                              void (async () => {
                                try {
                                  const full =
                                    data.students.find((r) => r.studentId === s.studentId) ?? {
                                      studentId: s.studentId,
                                      name: s.name,
                                      number: s.number,
                                      overallPct: s.overallPct,
                                      overallMarks: s.overallMarks ?? null,
                                      status: 'Failed' as const
                                    };
                                  await exportStudentCourseReportPdf(data, full);
                                  showToast('success', 'Student report opened — Save as PDF');
                                } catch (e) {
                                  showToast(
                                    'error',
                                    e instanceof Error ? e.message : 'Could not export student report'
                                  );
                                }
                              })();
                            }}
                          >
                            <FileText className='mr-1 size-3.5' />
                            Report
                          </Button>
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
                {data.classSummary.missingCount ?? 0} missing ·{' '}
                {data.classSummary.noGradeCount ?? 0} no grade ·{' '}
                {data.classSummary.notSubmittedCount ?? 0} not submitted
              </p>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[560px] text-left text-sm'>
                <thead>
                  <tr className='border-b border-border bg-muted/50 text-xs text-muted-foreground'>
                    <th className='px-4 py-2.5 font-medium'>Student</th>
                    <th className='px-4 py-2.5 font-medium'>ID</th>
                    <th className='px-4 py-2.5 text-right font-medium'>Overall marks</th>
                    <th className='px-4 py-2.5 font-medium'>Status</th>
                    <th className='px-4 py-2.5 font-medium'>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.map((s) => (
                    <tr key={s.studentId} className='border-b border-border last:border-0'>
                      <td className='px-4 py-2.5 font-medium'>{s.name}</td>
                      <td className='px-4 py-2.5 text-muted-foreground'>{s.number ?? '—'}</td>
                      <td className='px-4 py-2.5 text-right tabular-nums'>
                        {marksLabel(s.overallMarks, data.classSummary.courseMaxMarks)}
                      </td>
                      <td className='px-4 py-2.5'>
                        <span className={cn('text-xs font-medium', reportStatusClass(s.status))}>
                          {s.status}
                        </span>
                      </td>
                      <td className='px-4 py-2.5'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 px-2 text-xs'
                          onClick={() => {
                            void (async () => {
                              try {
                                await exportStudentCourseReportPdf(data, s);
                                showToast('success', 'Student report opened — Save as PDF');
                              } catch (e) {
                                showToast(
                                  'error',
                                  e instanceof Error
                                    ? e.message
                                    : 'Could not export student report'
                                );
                              }
                            })();
                          }}
                        >
                          <FileText className='mr-1 size-3.5' />
                          Report
                        </Button>
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
