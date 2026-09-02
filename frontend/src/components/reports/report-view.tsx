'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { useQueryClient } from '@/lib/async-query';
import {
  entityReportKeys,
  fetchReportList,
  useReportList
} from '@/lib/reports/queries/entity-reports';
import { showToast } from '@/lib/notifications';
import {
  inferPresetFromRange,
  clampReportDateRange,
  presetToDateRange,
  readDateRangeFromParams,
  reportDateRangeErrorMessage,
  resolveAppliedReportFilters,
  validateReportDateRange
} from '@/lib/reports/period-utils';
import { scheduleRouterReplace } from '@/lib/safe-router-navigation';
import {
  REPORT_PERIODS,
  REPORT_SCOPE_META,
  type ReportScope
} from '@/lib/reports/types';
import { PosTableLoading } from '@/features/pos/components/pos-table-status';
import { ReportDetailPage } from './report-detail-page';
import {
  exportReportListCsv,
  exportReportListPdf
} from './export-report';
import {
  ReportFiltersPanel,
  type ReportFilterValues
} from './report-filters-panel';
import { ReportListTable } from './report-list-table';
import { REPORT_SCOPE_COLUMNS, REPORT_SEARCH_PLACEHOLDER } from './report-scope-columns';
import { parseReportScope } from './report-scope-tabs';
import { TITLE_LG } from './report-theme';

function parsePeriod(raw: string | null | undefined): string {
  if (raw === 'custom') return 'custom';
  if (raw && REPORT_PERIODS.some((p) => p.id === raw)) return raw;
  return 'all';
}

function filtersFromParams(sp: URLSearchParams): ReportFilterValues {
  const scope = parseReportScope(sp.get('scope'));
  const periodParam = parsePeriod(sp.get('period'));
  const dateRange = readDateRangeFromParams(sp);
  const periodPreset = inferPresetFromRange(dateRange, periodParam);
  return {
    scope,
    periodPreset,
    dateRange:
      periodPreset === 'custom' ? dateRange : presetToDateRange(periodPreset),
    status: sp.get('status') ?? 'all'
  };
}

export function ReportView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const subjectId = searchParams?.get('id') ?? null;

  const [appliedFilters, setAppliedFilters] = useState<ReportFilterValues>(() =>
    filtersFromParams(new URLSearchParams(searchParams?.toString() ?? ''))
  );
  const [pendingFilters, setPendingFilters] = useState<ReportFilterValues>(() =>
    filtersFromParams(new URLSearchParams(searchParams?.toString() ?? ''))
  );

  const appliedResolved = useMemo(
    () => resolveAppliedReportFilters(appliedFilters),
    [appliedFilters]
  );
  const scope = appliedFilters.scope;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const skipUrlSyncRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (!params.get('scope')) params.set('scope', 'course');
    if (!params.get('period')) params.set('period', 'all');
    const next = params.toString();
    const current = searchParams?.toString() ?? '';
    if (next !== current) {
      scheduleRouterReplace(router, `/dashboard/reports?${next}`, { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    const fromUrl = filtersFromParams(new URLSearchParams(searchParams?.toString() ?? ''));
    setAppliedFilters(fromUrl);
    setPendingFilters(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    setSearch('');
    setPage(1);
    setSort(null);
  }, [scope]);

  useEffect(() => {
    setPage(1);
  }, [
    appliedResolved.period,
    appliedResolved.dateRange.from,
    appliedResolved.dateRange.to,
    appliedFilters.status,
    debouncedSearch
  ]);

  useEffect(() => {
    if (sort && !REPORT_SCOPE_COLUMNS[scope].includes(sort.key)) {
      setSort(null);
    }
  }, [scope, sort]);

  const windowParams = useMemo(
    () => ({
      from: appliedResolved.dateRange.from,
      to: appliedResolved.dateRange.to,
      status: appliedResolved.status
    }),
    [
      appliedResolved.dateRange.from,
      appliedResolved.dateRange.to,
      appliedResolved.status
    ]
  );

  const listQuery = useReportList(scope, appliedResolved.period, {
    page,
    pageSize,
    search: debouncedSearch,
    sort: sort?.key ?? null,
    dir: sort?.dir ?? 'asc',
    from: windowParams.from,
    to: windowParams.to,
    status: windowParams.status
  });

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    mutate(params);
    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false });
  };

  const applyFilters = (filters: ReportFilterValues) => {
    skipUrlSyncRef.current = true;
    replaceParams((params) => {
      params.set('scope', filters.scope);

      if (filters.periodPreset === 'custom') {
        params.set('period', 'custom');
        if (filters.dateRange.from) params.set('from', filters.dateRange.from);
        else params.delete('from');
        if (filters.dateRange.to) params.set('to', filters.dateRange.to);
        else params.delete('to');
      } else {
        params.set('period', filters.periodPreset);
        params.delete('from');
        params.delete('to');
      }

      if (filters.status && filters.status !== 'all') {
        params.set('status', filters.status);
      } else {
        params.delete('status');
      }
    });
    setPage(1);
    setSearch('');
  };

  const handleGenerate = () => {
    let filters = pendingFilters;

    if (filters.periodPreset === 'custom') {
      const clamped = clampReportDateRange(filters.dateRange);
      if (
        clamped.from !== filters.dateRange.from ||
        clamped.to !== filters.dateRange.to
      ) {
        filters = { ...filters, dateRange: clamped };
      }

      const errors = validateReportDateRange(filters.dateRange, { requireAny: true });
      if (errors) {
        showToast('error', reportDateRangeErrorMessage(errors));
        return;
      }
    }

    setAppliedFilters(filters);
    setPendingFilters(filters);
    applyFilters(filters);
    void queryClient.invalidateQueries({ queryKey: entityReportKeys.all });
  };

  const handleFilterChange = (patch: Partial<ReportFilterValues>) => {
    setPendingFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.periodPreset && patch.periodPreset !== 'custom') {
        next.dateRange = presetToDateRange(patch.periodPreset);
      }
      return next;
    });
  };

  const openDetail = (id: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('scope', scope);
    params.set('id', id);
    if (!params.get('period')) params.set('period', appliedResolved.period);
    router.push(`/dashboard/reports?${params.toString()}`, { scroll: false });
  };

  const closeDetail = () => {
    replaceParams((params) => {
      params.delete('id');
    });
  };

  const exportFilteredList = async () => {
    const total = listQuery.data?.total ?? 0;
    if (total === 0) return;
    const exportSize = Math.min(total, 200);
    return fetchReportList(scope, appliedResolved.period, {
      page: 1,
      pageSize: exportSize,
      search: debouncedSearch,
      sort: sort?.key ?? null,
      dir: sort?.dir ?? 'asc',
      from: windowParams.from,
      to: windowParams.to,
      status: windowParams.status
    });
  };

  const filtersPanel = (
    <ReportFiltersPanel
      values={pendingFilters}
      onChange={handleFilterChange}
      onGenerate={handleGenerate}
      isGenerating={listQuery.isFetching && !subjectId}
    />
  );

  if (subjectId) {
    return (
      <div className='flex flex-col gap-4'>
        <ReportDetailPage
          scope={scope}
          subjectId={subjectId}
          period={appliedResolved.period}
          window={windowParams}
          onBack={closeDetail}
          filtersPanel={filtersPanel}
          isGenerating={listQuery.isFetching}
        />
      </div>
    );
  }

  const meta = REPORT_SCOPE_META[scope];

  return (
    <div className='flex flex-col gap-4'>
      <h1 className={TITLE_LG}>{meta.title}</h1>

      {filtersPanel}

      {listQuery.error ? (
        <p className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive'>
          {listQuery.error.message}
        </p>
      ) : listQuery.isLoading && !listQuery.data ? (
        <PosTableLoading />
      ) : (
        <ReportListTable
          scope={scope}
          noun={meta.noun}
          plural={meta.plural}
          rows={listQuery.data?.rows ?? []}
          isFetching={listQuery.isFetching}
          onOpen={openDetail}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={REPORT_SEARCH_PLACEHOLDER[scope]}
          isSearching={
            search.trim() !== debouncedSearch ||
            (listQuery.isFetching && debouncedSearch.length > 0)
          }
          sort={sort}
          onSortChange={(s) => {
            setSort(s);
            setPage(1);
          }}
          page={page}
          pageSize={listQuery.data?.pageSize ?? pageSize}
          total={listQuery.data?.total ?? 0}
          totalUnfiltered={listQuery.data?.totalUnfiltered ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onExportPdf={async () => {
            const data = await exportFilteredList();
            if (!data) return;
            exportReportListPdf({
              scope,
              plural: meta.plural,
              period: appliedResolved.period,
              rows: data.rows,
              page: 1,
              pageSize: data.rows.length,
              total: data.total,
              totalUnfiltered: data.totalUnfiltered,
              search: debouncedSearch
            });
          }}
          onExportExcel={async () => {
            const data = await exportFilteredList();
            if (!data) return;
            exportReportListCsv({
              scope,
              plural: meta.plural,
              period: appliedResolved.period,
              rows: data.rows,
              page: 1,
              pageSize: data.rows.length,
              total: data.total
            });
          }}
        />
      )}
    </div>
  );
}
