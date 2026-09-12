'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ReportCustomDateFields } from '@/components/reports/report-custom-date-fields';
import {
  exportLecturerReportDetailCsv,
  exportLecturerReportDetailPdf,
  exportLecturerReportsListCsv,
  exportLecturerReportsListPdf
} from '@/components/reports/lecturer-reports/export-lecturer-report';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import {
  useLecturerReportDetail,
  useLecturerReportsList
} from '@/lib/teacher-courses/queries';
import { getLecturerReportsList } from '@/lib/teacher-courses/services';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n}%`;
}

function marks(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

type Filters = {
  department: string;
  lecturerId: string;
  period: string;
  from: string | null;
  to: string | null;
};

const defaultFilters: Filters = {
  department: 'all',
  lecturerId: 'all',
  period: 'semester',
  from: null,
  to: null
};

const STORAGE_KEY = 'lecturer-reports-filters:v1';

function LecturerReportsTable({ onOpen }: { onOpen: (id: number) => void }) {
  const { data: semesterWindow } = useActiveSemesterWindow();
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortId, setSortId] = useState('name-asc');
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
    appliedFilters.period === 'all' || (!!dateParams.from && !!dateParams.to);

  const listParams = useMemo(
    () => ({
      ...dateParams,
      page,
      pageSize,
      q: debouncedSearch || undefined,
      department: appliedFilters.department,
      lecturerId: appliedFilters.lecturerId,
      sort: sortId
    }),
    [dateParams, page, pageSize, debouncedSearch, appliedFilters, sortId]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useLecturerReportsList(
    listEnabled,
    listParams
  );
  const waitingForSemester =
    appliedFilters.period === 'semester' && (!dateParams.from || !dateParams.to);
  const showInitialLoading = waitingForSemester || (listEnabled && isLoading && !data);
  const showUpdating = isFetching && !showInitialLoading;
  const pageRows = data?.rows ?? [];
  const total = data?.total ?? data?.totalCount ?? pageRows.length;

  const lecturerOptions = useMemo(() => {
    const lecturers = data?.filterOptions?.lecturers ?? [];
    const filtered = lecturers.filter((l) => {
      if (draftFilters.department !== 'all' && (l.department ?? '') !== draftFilters.department) {
        return false;
      }
      return true;
    });
    return [
      { value: 'all', label: 'All lecturers' },
      ...filtered.map((l) => ({
        value: l.id,
        label: l.name,
        sub: [l.number, l.department].filter(Boolean).join(' · ')
      }))
    ];
  }, [data?.filterOptions?.lecturers, draftFilters.department]);

  const exportList = async (format: 'pdf' | 'csv') => {
    setExportingList(true);
    try {
      const all = await getLecturerReportsList({ ...listParams, page: 1, pageSize: 1000 });
      const rows = all.rows ?? [];
      if (format === 'pdf') exportLecturerReportsListPdf(rows);
      else exportLecturerReportsListCsv(rows);
      showToast('success', format === 'pdf' ? 'Print dialog opened' : 'CSV downloaded');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Could not export');
    } finally {
      setExportingList(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className={TITLE_LG}>Lecturer reports</h1>
          <p className={SUBTITLE}>
            Faculty lecturers with courses taught, content posted, and student outcomes.
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
              <Button size='sm' variant='outline' disabled={total === 0 || exportingList}>
                <Download className='mr-1.5 size-4' />
                {exportingList ? 'Exporting…' : 'Export list'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => void exportList('pdf')}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportList('csv')}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size='sm' variant='outline' onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-1.5 size-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <GlobalReportFilters
        description='Filter by department, lecturer, and date — then apply.'
        storageKey={STORAGE_KEY}
        getTemplate={() => draftFilters}
        onLoadTemplate={(raw) => {
          if (!raw || typeof raw !== 'object') return;
          const o = raw as Partial<Filters>;
          setDraftFilters({
            department: typeof o.department === 'string' ? o.department : 'all',
            lecturerId: typeof o.lecturerId === 'string' ? o.lecturerId : 'all',
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
              setDraftFilters((p) => ({ ...p, department: v, lecturerId: 'all' }))
            }
            placeholder='Department'
            searchPlaceholder='Search departments…'
            emptyText='No departments found.'
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>
        <GlobalFilterField label='Lecturer'>
          <SearchSelect
            options={lecturerOptions}
            value={draftFilters.lecturerId}
            onValueChange={(v) => setDraftFilters((p) => ({ ...p, lecturerId: v }))}
            placeholder='Select lecturer'
            searchPlaceholder='Search lecturers…'
            emptyText='No lecturers found.'
            loading={showInitialLoading}
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>
        <GlobalFilterField label='Period'>
          <Select
            value={draftFilters.period}
            onValueChange={(v) => {
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
            }}
          >
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
          Couldn&apos;t load lecturer reports: {error?.message ?? 'Unknown error'}
        </div>
      ) : null}

      <PosTableCard
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder='Filter by name or staff number…'
        sortOptions={[
          { id: 'name-asc', label: 'Name A–Z' },
          { id: 'name-desc', label: 'Name Z–A' },
          { id: 'courses-desc', label: 'Most courses' },
          { id: 'failed-desc', label: 'Most failed' },
          { id: 'avgOverallPct-desc', label: 'Highest avg %' }
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
              itemLabel={total === 1 ? 'lecturer' : 'lecturers'}
            />
          ) : null
        }
      >
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Lecturer</PosTableHeaderCell>
                <PosTableHeaderCell>Department</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Courses</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Quizzes</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Assignments</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Failed</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Avg marks</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Avg %</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {showInitialLoading ? (
                <PosTableRow>
                  <PosTableCell colSpan={9} className={META}>
                    Loading…
                  </PosTableCell>
                </PosTableRow>
              ) : pageRows.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={9} className={META}>
                    No lecturers match these filters.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                pageRows.map((r) => (
                  <PosTableRow
                    key={r.id}
                    className='cursor-pointer'
                    onClick={() => onOpen(r.id)}
                  >
                    <PosTableCell>
                      <div className={BODY}>{r.name}</div>
                      {r.number ? <div className={META}>{r.number}</div> : null}
                    </PosTableCell>
                    <PosTableCell className={BODY}>{r.department ?? '—'}</PosTableCell>
                    <PosTableCell className='text-right'>{r.courses}</PosTableCell>
                    <PosTableCell className='text-right'>{r.students}</PosTableCell>
                    <PosTableCell className='text-right'>{r.quizzes}</PosTableCell>
                    <PosTableCell className='text-right'>{r.assignments}</PosTableCell>
                    <PosTableCell className='text-right'>{r.failed}</PosTableCell>
                    <PosTableCell className='text-right'>{marks(r.avgOverallMarks)}</PosTableCell>
                    <PosTableCell className='text-right'>{pct(r.avgOverallPct)}</PosTableCell>
                  </PosTableRow>
                ))
              )}
            </PosTableBody>
          </PosTable>
        </div>
      </PosTableCard>
    </div>
  );
}

function LecturerReportDetailView({
  teacherId,
  onBack
}: {
  teacherId: number;
  onBack: () => void;
}) {
  const { data: semesterWindow } = useActiveSemesterWindow();
  const dateParams = {
    from: semesterWindow?.minDate ?? null,
    to: semesterWindow?.maxDate ?? null
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useLecturerReportDetail(
    teacherId,
    true,
    dateParams
  );

  const exportDetail = (format: 'pdf' | 'csv') => {
    if (!data) return;
    if (format === 'pdf') exportLecturerReportDetailPdf(data);
    else exportLecturerReportDetailCsv(data);
    showToast('success', format === 'pdf' ? 'Print dialog opened' : 'CSV downloaded');
  };

  if (isLoading && !data) {
    return <div className={META}>Loading lecturer report…</div>;
  }
  if (isError || !data) {
    return (
      <div className='space-y-3'>
        <Button variant='ghost' size='sm' onClick={onBack}>
          <ArrowLeft className='mr-1.5 size-4' /> All lecturers
        </Button>
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load this lecturer report: {error?.message ?? 'Not found'}
        </div>
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <button type='button' onClick={onBack} className={`${META} mb-1 inline-flex items-center`}>
            <ArrowLeft className='mr-1 size-3.5' /> All lecturers
          </button>
          <h1 className={TITLE_LG}>{data.lecturer.name}</h1>
          <p className={SUBTITLE}>
            {[data.lecturer.number, data.lecturer.department].filter(Boolean).join(' · ') ||
              'Lecturer report'}
          </p>
        </div>
        <div className='flex gap-2'>
          {isFetching ? (
            <span className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
              <RefreshCw className='size-3.5 animate-spin' />
              Updating…
            </span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size='sm' variant='outline'>
                <Download className='mr-1.5 size-4' /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => exportDetail('pdf')}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportDetail('csv')}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size='sm' variant='outline' onClick={() => void refetch()}>
            <RefreshCw className='mr-1.5 size-4' /> Refresh
          </Button>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
        {[
          ['Courses', s.courses],
          ['Students', s.students],
          ['Failed', s.failed],
          ['Avg marks', marks(s.avgOverallMarks)],
          ['Avg %', pct(s.avgOverallPct)]
        ].map(([label, value]) => (
          <div key={String(label)} className={KPI_TILE}>
            <div className={KPI_LABEL}>{label}</div>
            <div className={KPI_VALUE}>{value}</div>
          </div>
        ))}
      </div>

      <div className={CARD}>
        <h2 className={`${TITLE_MD} mb-3`}>Courses</h2>
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Course</PosTableHeaderCell>
                <PosTableHeaderCell>Section</PosTableHeaderCell>
                <PosTableHeaderCell>Batch</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Failed</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Avg %</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {data.courses.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={6} className={META}>
                    No courses assigned.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                data.courses.map((c) => (
                  <PosTableRow key={c.id}>
                    <PosTableCell>
                      <div className={BODY}>
                        {c.courseCode} — {c.courseName}
                      </div>
                      <div className={META}>{c.department ?? ''}</div>
                    </PosTableCell>
                    <PosTableCell>{c.section}</PosTableCell>
                    <PosTableCell>{c.batch ?? '—'}</PosTableCell>
                    <PosTableCell className='text-right'>{c.students}</PosTableCell>
                    <PosTableCell className='text-right'>{c.failed}</PosTableCell>
                    <PosTableCell className='text-right'>{pct(c.avgOverallPct)}</PosTableCell>
                  </PosTableRow>
                ))
              )}
            </PosTableBody>
          </PosTable>
        </div>
      </div>
    </div>
  );
}

export function LecturerReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lecturerParam = searchParams.get('lecturer');
  const teacherId = lecturerParam ? Number(lecturerParam) : null;

  const open = (id: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('lecturer', String(id));
    router.push(`${pathname}?${next.toString()}`);
  };

  const back = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('lecturer');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  if (teacherId && !Number.isNaN(teacherId)) {
    return <LecturerReportDetailView teacherId={teacherId} onBack={back} />;
  }

  return <LecturerReportsTable onOpen={open} />;
}
