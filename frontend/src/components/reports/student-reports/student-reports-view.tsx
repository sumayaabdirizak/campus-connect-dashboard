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
import { SearchSelect } from '@/components/ui/search-select';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import { useDebounce } from '@/hooks/use-debounce';
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
  SUBTITLE,
  TITLE_LG,
  TITLE_MD
} from '@/components/reports/report-theme';
import {
  GlobalFilterField,
  GlobalReportFilters,
  GLOBAL_FILTER_CONTROL
} from '@/components/reports/global-report-filters';
import {
  exportStudentReportDetailCsv,
  exportStudentReportDetailExcel,
  exportStudentReportDetailPdf,
  exportStudentReportDetailWord,
  exportStudentReportsListCsv,
  exportStudentReportsListExcel,
  exportStudentReportsListPdf,
  exportStudentReportsListWord
} from '@/components/reports/student-reports/export-student-report';
import { ReportCustomDateFields } from '@/components/reports/report-custom-date-fields';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import {
  useStudentReportDetail,
  useStudentReportsList
} from '@/lib/teacher-courses/queries';
import { getStudentReportsList } from '@/lib/teacher-courses/services';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

function marksLabel(n: number | null | undefined, max?: number | null): string {
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

type StudentReportFilters = {
  department: string;
  courseId: string;
  studentId: string;
  period: string;
  from: string | null;
  to: string | null;
};

const defaultFilters: StudentReportFilters = {
  department: 'all',
  courseId: 'all',
  studentId: 'all',
  period: 'semester',
  from: null,
  to: null
};

const STORAGE_KEY = 'student-reports-filters:v2';

function StudentReportsTable({
  onOpen
}: {
  onOpen: (studentId: number, offeringId: string) => void;
}) {
  const { data: semesterWindow } = useActiveSemesterWindow();
  const [draftFilters, setDraftFilters] = useState<StudentReportFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<StudentReportFilters>(defaultFilters);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortId, setSortId] = useState('studentName-asc');
  const [exportingList, setExportingList] = useState(false);

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
      studentId: appliedFilters.studentId,
      sort: sortId
    }),
    [dateParams, page, pageSize, debouncedSearch, appliedFilters, sortId]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useStudentReportsList(
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

  const courseOptions = useMemo(() => {
    const courses = data?.filterOptions?.courses ?? [];
    const filtered = courses.filter((c) => {
      if (draftFilters.department !== 'all' && (c.department ?? '') !== draftFilters.department) {
        return false;
      }
      return true;
    });
    return [
      { value: 'all', label: 'All courses' },
      ...filtered.map((c) => ({
        value: c.id,
        label: c.label,
        sub: [c.section, c.batch, c.department].filter(Boolean).join(' · ')
      }))
    ];
  }, [data?.filterOptions?.courses, draftFilters.department]);

  const studentOptions = useMemo(() => {
    const students = data?.filterOptions?.students ?? [];
    const filtered = students.filter((s) => {
      if (draftFilters.department !== 'all' && (s.department ?? '') !== draftFilters.department) {
        return false;
      }
      return true;
    });
    return [
      { value: 'all', label: 'All students' },
      ...filtered.map((s) => ({
        value: s.id,
        label: s.name,
        sub: s.number ?? undefined
      }))
    ];
  }, [data?.filterOptions?.students, draftFilters.department]);

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
      const all = await getStudentReportsList({
        ...listParams,
        page: 1,
        pageSize: 1000
      });
      const rows = all.rows ?? [];
      if (format === 'pdf') {
        exportStudentReportsListPdf(rows);
        showToast('success', 'Print dialog opened — choose Save as PDF');
      } else if (format === 'excel') {
        exportStudentReportsListExcel(rows);
        showToast('success', 'Excel list downloaded');
      } else if (format === 'csv') {
        exportStudentReportsListCsv(rows);
        showToast('success', 'CSV list downloaded');
      } else {
        exportStudentReportsListWord(rows);
        showToast('success', 'Word list downloaded');
      }
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not export list');
    } finally {
      setExportingList(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className={TITLE_LG}>Student reports</h1>
          <p className={SUBTITLE}>
            Filter students across your courses, then open one for a detailed report.
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
                disabled={total === 0 || exportingList}
              >
                <Download className='mr-1.5 size-4' />
                {exportingList ? 'Exporting…' : 'Export list'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Filtered students ({total})</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('pdf')}
              >
                <FileText className='mr-2 size-4' /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('excel')}
              >
                <FileSpreadsheet className='mr-2 size-4' /> Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('csv')}
              >
                <Download className='mr-2 size-4' /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportingList || total === 0}
                onClick={() => void exportList('word')}
              >
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

      <GlobalReportFilters
        description='Filter by department, course, student, and date — then apply.'
        storageKey={STORAGE_KEY}
        getTemplate={() => draftFilters}
        onLoadTemplate={(raw) => {
          if (!raw || typeof raw !== 'object') return;
          const o = raw as Partial<StudentReportFilters>;
          setDraftFilters({
            department: typeof o.department === 'string' ? o.department : 'all',
            courseId: typeof o.courseId === 'string' ? o.courseId : 'all',
            studentId: typeof o.studentId === 'string' ? o.studentId : 'all',
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
          setDraftFilters(defaultFilters);
          setAppliedFilters(defaultFilters);
          setPage(1);
        }}
      >
        <GlobalFilterField label='Department'>
          <SearchSelect
            options={[
              { value: 'all', label: 'All departments' },
              ...(data?.filterOptions?.departments ?? []).map((d) => ({
                value: d,
                label: d
              }))
            ]}
            value={draftFilters.department}
            onValueChange={(v) =>
              setDraftFilters((p) => ({
                ...p,
                department: v,
                courseId: 'all',
                studentId: 'all'
              }))
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
            onValueChange={(v) =>
              setDraftFilters((p) => ({ ...p, courseId: v, studentId: 'all' }))
            }
            placeholder='Select course'
            searchPlaceholder='Search courses…'
            emptyText='No courses found.'
            loading={showInitialLoading}
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>

        <GlobalFilterField label='Student'>
          <SearchSelect
            options={studentOptions}
            value={draftFilters.studentId}
            onValueChange={(v) => setDraftFilters((p) => ({ ...p, studentId: v }))}
            placeholder='Select student'
            searchPlaceholder='Search students…'
            emptyText='No students found.'
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
          Couldn&apos;t load students: {error?.message}
        </div>
      ) : null}

      <PosTableCard
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder='Filter by student, course, batch…'
        sortOptions={[
          { id: 'studentName-asc', label: 'Student A–Z' },
          { id: 'studentName-desc', label: 'Student Z–A' },
          { id: 'overallMarks-desc', label: 'Marks (high first)' },
          { id: 'overallMarks-asc', label: 'Marks (low first)' },
          { id: 'courseCode-asc', label: 'Course code A–Z' }
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
              itemLabel={total === 1 ? 'student' : 'students'}
            />
          ) : null
        }
      >
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Student</PosTableHeaderCell>
                <PosTableHeaderCell>Course</PosTableHeaderCell>
                <PosTableHeaderCell>Section</PosTableHeaderCell>
                <PosTableHeaderCell>Batch</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Overall marks</PosTableHeaderCell>
                <PosTableHeaderCell>Status</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {showInitialLoading ? (
                <PosTableRow>
                  <PosTableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                    Loading students…
                  </PosTableCell>
                </PosTableRow>
              ) : null}
              {!showInitialLoading && pageRows.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                    No students match these filters.
                  </PosTableCell>
                </PosTableRow>
              ) : null}
              {pageRows.map((row) => (
                <PosTableRow
                  key={row.id}
                  className='cursor-pointer hover:bg-muted/40'
                  onClick={() => onOpen(row.studentId, row.offeringId)}
                >
                  <PosTableCell>
                    <div>
                      <p className='font-medium text-foreground'>{row.studentName}</p>
                      <p className='text-xs text-muted-foreground'>{row.studentNumber ?? '—'}</p>
                    </div>
                  </PosTableCell>
                  <PosTableCell>
                    <div>
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
                  <PosTableCell className='text-right tabular-nums'>
                    {marksLabel(row.overallMarks, row.courseMaxMarks)}
                  </PosTableCell>
                  <PosTableCell>
                    <span className={cn('text-xs font-medium', reportStatusClass(row.status))}>
                      {row.status}
                    </span>
                  </PosTableCell>
                </PosTableRow>
              ))}
            </PosTableBody>
          </PosTable>
        </div>
      </PosTableCard>
    </div>
  );
}

function StudentReportDetailView({
  studentId,
  offeringId,
  onBack
}: {
  studentId: number;
  offeringId: string;
  onBack: () => void;
}) {
  const { data, isLoading, isFetching, isError, error, refetch } = useStudentReportDetail(
    studentId,
    offeringId,
    true
  );
  const showUpdating = isFetching && !!data;

  const handleExport = (format: 'pdf' | 'excel' | 'csv' | 'word') => {
    if (!data) return;
    if (format === 'pdf') {
      exportStudentReportDetailPdf(data);
      showToast('success', 'Print dialog opened — choose Save as PDF');
      return;
    }
    if (format === 'excel') {
      exportStudentReportDetailExcel(data);
      showToast('success', 'Excel report downloaded');
      return;
    }
    if (format === 'csv') {
      exportStudentReportDetailCsv(data);
      showToast('success', 'CSV report downloaded');
      return;
    }
    exportStudentReportDetailWord(data);
    showToast('success', 'Word report downloaded');
  };

  const kpis = data
    ? [
        {
          label: 'Overall marks',
          value: marksLabel(data.student.overallMarks, data.classSummary.courseMaxMarks)
        },
        { label: 'Status', value: data.student.status },
        { label: 'Quizzes', value: data.content.quizzes },
        { label: 'Assignments', value: data.content.assignments }
      ]
    : [];

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 space-y-2'>
          <Button size='sm' variant='ghost' className='-ml-2 h-8 px-2' onClick={onBack}>
            <ArrowLeft className='mr-1.5 size-4' />
            All students
          </Button>
          {data ? (
            <>
              <h1 className={TITLE_LG}>{data.student.name}</h1>
              <p className={SUBTITLE}>
                {data.student.number ?? 'No ID'} · {data.course.courseCode} —{' '}
                {data.course.courseName}
                {data.course.section ? ` · ${data.course.section}` : ''}
                {data.course.batch ? ` · ${data.course.batch}` : ''}
              </p>
            </>
          ) : (
            <h1 className={TITLE_LG}>Student report</h1>
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
              <DropdownMenuLabel>Export student report</DropdownMenuLabel>
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
          Couldn&apos;t load this student report: {error?.message}
        </div>
      ) : null}

      {isLoading && !data ? (
        <p className={cn(BODY, 'py-12 text-center')}>Loading student report…</p>
      ) : null}

      {data ? (
        <>
          <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
            {kpis.map((k) => (
              <div key={k.label} className={KPI_TILE}>
                <p className={KPI_LABEL}>{k.label}</p>
                <p className={KPI_VALUE}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className={cn(CARD, 'overflow-hidden')}>
            <div className='border-b border-border px-4 py-3'>
              <p className={TITLE_MD}>Course content</p>
              <p className={META}>
                Per-item status for quizzes and assignments · resources listed below
              </p>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[560px] text-left text-sm'>
                <thead>
                  <tr className='border-b border-border bg-muted/50 text-xs text-muted-foreground'>
                    <th className='px-4 py-2.5 font-medium'>Type</th>
                    <th className='px-4 py-2.5 text-right font-medium'>Marks</th>
                    <th className='px-4 py-2.5 font-medium'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.quizItems.map((i) => (
                    <tr key={`q-${i.id}`} className='border-b border-border last:border-0'>
                      <td className='px-4 py-2.5'>
                        <span className='text-muted-foreground'>Quiz · </span>
                        <span className='font-medium'>{i.title}</span>
                      </td>
                      <td className='px-4 py-2.5 text-right tabular-nums'>
                        {marksLabel(i.score ?? null, i.maxMarks ?? null)}
                      </td>
                      <td className='px-4 py-2.5'>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            reportStatusClass(i.status ?? 'Not submitted')
                          )}
                        >
                          {i.status ?? 'Not submitted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.content.assignmentItems.map((i) => (
                    <tr key={`a-${i.id}`} className='border-b border-border last:border-0'>
                      <td className='px-4 py-2.5'>
                        <span className='text-muted-foreground'>Assignment · </span>
                        <span className='font-medium'>{i.title}</span>
                      </td>
                      <td className='px-4 py-2.5 text-right tabular-nums'>
                        {marksLabel(i.score ?? null, i.maxMarks ?? null)}
                      </td>
                      <td className='px-4 py-2.5'>
                        <span
                          className={cn(
                            'text-xs font-medium',
                            reportStatusClass(i.status ?? 'Not submitted')
                          )}
                        >
                          {i.status ?? 'Not submitted'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.content.quizItems.length === 0 &&
                  data.content.assignmentItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className='px-4 py-6 text-center text-muted-foreground'>
                        No published quizzes or assignments.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {data.content.resourceItems.length > 0 ? (
              <div className='border-t border-border px-4 py-3'>
                <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  Resources
                </p>
                <ul className='space-y-1 text-sm'>
                  {data.content.resourceItems.map((i) => (
                    <li key={i.id}>
                      {i.title}
                      {i.type ? (
                        <span className='text-muted-foreground'> · {i.type}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function StudentReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const studentIdRaw = searchParams.get('student');
  const offeringId = searchParams.get('offering') ?? '';
  const studentId = studentIdRaw ? Number(studentIdRaw) : null;

  const openStudent = (sid: number, oid: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('student', String(sid));
    next.set('offering', oid);
    router.push(`${pathname}?${next.toString()}`);
  };

  const backToList = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('student');
    next.delete('offering');
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  };

  if (studentId && offeringId) {
    return (
      <StudentReportDetailView
        studentId={studentId}
        offeringId={offeringId}
        onBack={backToList}
      />
    );
  }

  return <StudentReportsTable onOpen={openStudent} />;
}
