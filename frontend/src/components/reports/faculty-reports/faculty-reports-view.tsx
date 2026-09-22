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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { BODY, CARD, KPI_LABEL, KPI_TILE, KPI_VALUE, META, SUBTITLE, TITLE_LG, TITLE_MD } from '@/components/reports/report-theme';
import {
  GlobalFilterField,
  GlobalReportFilters,
  GLOBAL_FILTER_CONTROL
} from '@/components/reports/global-report-filters';
import { ReportCustomDateFields } from '@/components/reports/report-custom-date-fields';
import {
  exportFacultyReportDetailCsv,
  exportFacultyReportDetailPdf,
  exportFacultyReportsListCsv,
  exportFacultyReportsListPdf
} from '@/components/reports/faculty-reports/export-faculty-report';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import { useFacultyReportDetail, useFacultyReportsList } from '@/lib/teacher-courses/queries';
import { getFacultyReportsList } from '@/lib/teacher-courses/services';
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
  facultyId: string;
  period: string;
  from: string | null;
  to: string | null;
};

const defaultFilters: Filters = {
  facultyId: 'all',
  period: 'semester',
  from: null,
  to: null
};

function FacultyReportsTable({ onOpen }: { onOpen: (id: number) => void }) {
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
      return { from: semesterWindow?.minDate ?? null, to: semesterWindow?.maxDate ?? null };
    }
    return { from: null, to: null };
  }, [appliedFilters, semesterWindow?.minDate, semesterWindow?.maxDate]);

  const listEnabled = appliedFilters.period === 'all' || (!!dateParams.from && !!dateParams.to);

  const listParams = useMemo(
    () => ({
      ...dateParams,
      page,
      pageSize,
      q: debouncedSearch || undefined,
      facultyId: appliedFilters.facultyId,
      sort: sortId
    }),
    [dateParams, page, pageSize, debouncedSearch, appliedFilters, sortId]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useFacultyReportsList(
    listEnabled,
    listParams
  );
  const waitingForSemester = appliedFilters.period === 'semester' && (!dateParams.from || !dateParams.to);
  const showInitialLoading = waitingForSemester || (listEnabled && isLoading && !data);
  const showUpdating = isFetching && !showInitialLoading;
  const pageRows = data?.rows ?? [];
  const total = data?.total ?? data?.totalCount ?? pageRows.length;

  const facultyOptions = useMemo(
    () => [
      { value: 'all', label: 'All faculties' },
      ...(data?.filterOptions?.faculties ?? []).map((f) => ({
        value: f.id,
        label: f.name,
        sub: f.code ?? undefined
      }))
    ],
    [data?.filterOptions?.faculties]
  );

  const exportList = async (format: 'pdf' | 'csv') => {
    setExportingList(true);
    try {
      const all = await getFacultyReportsList({ ...listParams, page: 1, pageSize: 1000 });
      const rows = all.rows ?? [];
      if (format === 'pdf') exportFacultyReportsListPdf(rows);
      else exportFacultyReportsListCsv(rows);
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
          <h1 className={TITLE_LG}>Faculty reports</h1>
          <p className={SUBTITLE}>All faculties with departments, courses, and student outcomes.</p>
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
        description='Filter by faculty and date — then apply.'
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
        <GlobalFilterField label='Faculty'>
          <SearchSelect
            options={facultyOptions}
            value={draftFilters.facultyId}
            onValueChange={(v) => setDraftFilters((p) => ({ ...p, facultyId: v }))}
            placeholder='Select faculty'
            searchPlaceholder='Search faculties…'
            emptyText='No faculties found.'
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
          Couldn&apos;t load faculty reports: {error?.message ?? 'Unknown error'}
        </div>
      ) : null}

      <PosTableCard
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder='Filter by faculty name or code…'
        sortOptions={[
          { id: 'name-asc', label: 'Name A–Z' },
          { id: 'name-desc', label: 'Name Z–A' },
          { id: 'students-desc', label: 'Most students' },
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
              itemLabel={total === 1 ? 'faculty' : 'faculties'}
            />
          ) : null
        }
      >
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Faculty</PosTableHeaderCell>
                <PosTableHeaderCell>Code</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Departments</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Courses</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Failed</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Avg %</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {showInitialLoading ? (
                <PosTableRow>
                  <PosTableCell colSpan={7} className={META}>
                    Loading…
                  </PosTableCell>
                </PosTableRow>
              ) : pageRows.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={7} className={META}>
                    No faculties match these filters.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                pageRows.map((r) => (
                  <PosTableRow key={r.id} className='cursor-pointer' onClick={() => onOpen(r.id)}>
                    <PosTableCell className={BODY}>{r.name}</PosTableCell>
                    <PosTableCell className={BODY}>{r.code ?? '—'}</PosTableCell>
                    <PosTableCell className='text-right'>{r.departments}</PosTableCell>
                    <PosTableCell className='text-right'>{r.students}</PosTableCell>
                    <PosTableCell className='text-right'>{r.courses}</PosTableCell>
                    <PosTableCell className='text-right'>{r.failed}</PosTableCell>
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

function FacultyReportDetailView({ facultyId, onBack }: { facultyId: number; onBack: () => void }) {
  const { data: semesterWindow } = useActiveSemesterWindow();
  const dateParams = { from: semesterWindow?.minDate ?? null, to: semesterWindow?.maxDate ?? null };
  const { data, isLoading, isError, error, refetch, isFetching } = useFacultyReportDetail(
    facultyId,
    true,
    dateParams
  );

  const exportDetail = (format: 'pdf' | 'csv') => {
    if (!data) return;
    if (format === 'pdf') exportFacultyReportDetailPdf(data);
    else exportFacultyReportDetailCsv(data);
    showToast('success', format === 'pdf' ? 'Print dialog opened' : 'CSV downloaded');
  };

  if (isLoading && !data) {
    return <div className={META}>Loading faculty report…</div>;
  }
  if (isError || !data) {
    return (
      <div className='space-y-3'>
        <Button variant='ghost' size='sm' onClick={onBack}>
          <ArrowLeft className='mr-1.5 size-4' /> All faculties
        </Button>
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load this faculty report: {error?.message ?? 'Not found'}
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
            <ArrowLeft className='mr-1 size-3.5' /> All faculties
          </button>
          <h1 className={TITLE_LG}>{data.faculty.name}</h1>
          <p className={SUBTITLE}>{data.faculty.code ?? 'Faculty report'}</p>
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

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-6'>
        {[
          ['Departments', s.departments],
          ['Students', s.students],
          ['Courses', s.courses],
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
        <h2 className={`${TITLE_MD} mb-3`}>Departments</h2>
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Department</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Courses</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {data.departments.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={3} className={META}>
                    No departments.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                data.departments.map((d) => (
                  <PosTableRow key={d.id}>
                    <PosTableCell className={BODY}>{d.name}</PosTableCell>
                    <PosTableCell className='text-right'>{d.courses}</PosTableCell>
                    <PosTableCell className='text-right'>{d.students}</PosTableCell>
                  </PosTableRow>
                ))
              )}
            </PosTableBody>
          </PosTable>
        </div>
      </div>

      <div className={CARD}>
        <h2 className={`${TITLE_MD} mb-3`}>Courses</h2>
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Course</PosTableHeaderCell>
                <PosTableHeaderCell>Section</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Failed</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Avg %</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {data.courses.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={5} className={META}>
                    No courses in this faculty.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                data.courses.map((c) => (
                  <PosTableRow key={c.id}>
                    <PosTableCell>
                      <div className={BODY}>
                        {c.courseCode} — {c.courseName}
                      </div>
                    </PosTableCell>
                    <PosTableCell>{c.section}</PosTableCell>
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

export function FacultyReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const facultyParam = searchParams.get('faculty');
  const facultyId = facultyParam ? Number(facultyParam) : null;

  const open = (id: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('faculty', String(id));
    router.push(`${pathname}?${next.toString()}`);
  };

  const back = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('faculty');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  if (facultyId && !Number.isNaN(facultyId)) {
    return <FacultyReportDetailView facultyId={facultyId} onBack={back} />;
  }

  return <FacultyReportsTable onOpen={open} />;
}
