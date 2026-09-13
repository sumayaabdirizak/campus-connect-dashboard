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
  exportBatchReportDetailCsv,
  exportBatchReportDetailPdf,
  exportBatchReportsListCsv,
  exportBatchReportsListPdf
} from '@/components/reports/batch-reports/export-batch-report';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import { useBatchReportDetail, useBatchReportsList } from '@/lib/teacher-courses/queries';
import { getBatchReportsList } from '@/lib/teacher-courses/services';
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
  batchId: string;
  status: string;
  period: string;
  from: string | null;
  to: string | null;
};

const defaultFilters: Filters = {
  department: 'all',
  batchId: 'all',
  status: 'ACTIVE',
  period: 'semester',
  from: null,
  to: null
};

const STORAGE_KEY = 'batch-reports-filters:v2';

function BatchReportsTable({ onOpen }: { onOpen: (id: number) => void }) {
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
      batchId: appliedFilters.batchId,
      status: appliedFilters.status,
      sort: sortId
    }),
    [dateParams, page, pageSize, debouncedSearch, appliedFilters, sortId]
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useBatchReportsList(
    listEnabled,
    listParams
  );
  const waitingForSemester =
    appliedFilters.period === 'semester' && (!dateParams.from || !dateParams.to);
  const showInitialLoading = waitingForSemester || (listEnabled && isLoading && !data);
  const showUpdating = isFetching && !showInitialLoading;
  const pageRows = data?.rows ?? [];
  const total = data?.total ?? data?.totalCount ?? pageRows.length;

  const batchOptions = useMemo(() => {
    const batches = data?.filterOptions?.batches ?? [];
    const filtered = batches.filter((b) => {
      if (draftFilters.department !== 'all' && (b.department ?? '') !== draftFilters.department) {
        return false;
      }
      if (draftFilters.status !== 'all' && (b.status ?? '') !== draftFilters.status) {
        return false;
      }
      return true;
    });
    return [
      { value: 'all', label: 'All batches' },
      ...filtered.map((b) => ({
        value: b.id,
        label: b.name,
        sub: [b.programme, b.department, b.status].filter(Boolean).join(' · ')
      }))
    ];
  }, [data?.filterOptions?.batches, draftFilters.department, draftFilters.status]);

  const exportList = async (format: 'pdf' | 'csv') => {
    setExportingList(true);
    try {
      const all = await getBatchReportsList({ ...listParams, page: 1, pageSize: 1000 });
      const rows = all.rows ?? [];
      if (format === 'pdf') exportBatchReportsListPdf(rows);
      else exportBatchReportsListCsv(rows);
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
          <h1 className={TITLE_LG}>Batch reports</h1>
          <p className={SUBTITLE}>
            Faculty batches with sections, courses, and student outcomes.
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
        description='Filter by department, batch, status, and date — then apply.'
        storageKey={STORAGE_KEY}
        onLoadTemplate={(raw) => {
          if (!raw || typeof raw !== 'object') return;
          const o = raw as Partial<Filters>;
          setDraftFilters({
            department: typeof o.department === 'string' ? o.department : 'all',
            batchId: typeof o.batchId === 'string' ? o.batchId : 'all',
            status: typeof o.status === 'string' ? o.status : 'ACTIVE',
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
              setDraftFilters((p) => ({ ...p, department: v, batchId: 'all' }))
            }
            placeholder='Department'
            searchPlaceholder='Search departments…'
            emptyText='No departments found.'
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>
        <GlobalFilterField label='Batch'>
          <SearchSelect
            options={batchOptions}
            value={draftFilters.batchId}
            onValueChange={(v) => setDraftFilters((p) => ({ ...p, batchId: v }))}
            placeholder='Select batch'
            searchPlaceholder='Search batches…'
            emptyText='No batches found.'
            loading={showInitialLoading}
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>
        <GlobalFilterField label='Status'>
          <Select
            value={draftFilters.status}
            onValueChange={(v) =>
              setDraftFilters((p) => ({ ...p, status: v, batchId: 'all' }))
            }
          >
            <SelectTrigger className={cn('w-full', GLOBAL_FILTER_CONTROL)}>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All statuses</SelectItem>
              {(data?.filterOptions?.statuses ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          Couldn&apos;t load batch reports: {error?.message ?? 'Unknown error'}
        </div>
      ) : null}

      <PosTableCard
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder='Filter by batch or programme…'
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
              itemLabel={total === 1 ? 'batch' : 'batches'}
            />
          ) : null
        }
      >
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Batch</PosTableHeaderCell>
                <PosTableHeaderCell>Programme</PosTableHeaderCell>
                <PosTableHeaderCell>Department</PosTableHeaderCell>
                <PosTableHeaderCell>Status</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Sections</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Courses</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Failed</PosTableHeaderCell>
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
                    No batches match these filters.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                pageRows.map((r) => (
                  <PosTableRow
                    key={r.id}
                    className='cursor-pointer'
                    onClick={() => onOpen(r.id)}
                  >
                    <PosTableCell className={BODY}>{r.name}</PosTableCell>
                    <PosTableCell className={BODY}>{r.programme ?? '—'}</PosTableCell>
                    <PosTableCell className={BODY}>{r.department ?? '—'}</PosTableCell>
                    <PosTableCell className={BODY}>{r.status ?? '—'}</PosTableCell>
                    <PosTableCell className='text-right'>{r.sections}</PosTableCell>
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

function BatchReportDetailView({
  batchId,
  onBack
}: {
  batchId: number;
  onBack: () => void;
}) {
  const { data: semesterWindow } = useActiveSemesterWindow();
  const dateParams = {
    from: semesterWindow?.minDate ?? null,
    to: semesterWindow?.maxDate ?? null
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useBatchReportDetail(
    batchId,
    true,
    dateParams
  );

  const exportDetail = (format: 'pdf' | 'csv') => {
    if (!data) return;
    if (format === 'pdf') exportBatchReportDetailPdf(data);
    else exportBatchReportDetailCsv(data);
    showToast('success', format === 'pdf' ? 'Print dialog opened' : 'CSV downloaded');
  };

  if (isLoading && !data) {
    return <div className={META}>Loading batch report…</div>;
  }
  if (isError || !data) {
    return (
      <div className='space-y-3'>
        <Button variant='ghost' size='sm' onClick={onBack}>
          <ArrowLeft className='mr-1.5 size-4' /> All batches
        </Button>
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load this batch report: {error?.message ?? 'Not found'}
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
            <ArrowLeft className='mr-1 size-3.5' /> All batches
          </button>
          <h1 className={TITLE_LG}>{data.batch.name}</h1>
          <p className={SUBTITLE}>
            {[data.batch.programme, data.batch.department, data.batch.status]
              .filter(Boolean)
              .join(' · ') || 'Batch report'}
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

      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-6'>
        {[
          ['Sections', s.sections],
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
        <h2 className={`${TITLE_MD} mb-3`}>Sections</h2>
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Section</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Students</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {data.sections.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={2} className={META}>
                    No sections.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                data.sections.map((sec) => (
                  <PosTableRow key={sec.id}>
                    <PosTableCell className={BODY}>{sec.name}</PosTableCell>
                    <PosTableCell className='text-right'>{sec.students}</PosTableCell>
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
                    No courses in this batch.
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

export function BatchReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const batchParam = searchParams.get('batch');
  const batchId = batchParam ? Number(batchParam) : null;

  const open = (id: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('batch', String(id));
    router.push(`${pathname}?${next.toString()}`);
  };

  const back = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('batch');
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  if (batchId && !Number.isNaN(batchId)) {
    return <BatchReportDetailView batchId={batchId} onBack={back} />;
  }

  return <BatchReportsTable onOpen={open} />;
}
