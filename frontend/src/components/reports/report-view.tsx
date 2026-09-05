'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
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
  activityReportScopesForRole,
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
import { parseReportScope, ReportScopeTabs } from './report-scope-tabs';
import { TITLE_LG } from './report-theme';

function parsePeriod(raw: string | null | undefined): string {
  if (raw === 'custom') return 'custom';
  if (raw && REPORT_PERIODS.some((p) => p.id === raw)) return raw;
  return 'all';
}

function filtersFromParams(
  sp: URLSearchParams,
  allowedScopes: readonly ReportScope[]
): ReportFilterValues {
  const scope = parseReportScope(sp.get('scope'), allowedScopes);
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
  const role = useAuthStore((s) => s.user?.role);
  const allowedScopes = useMemo(() => activityReportScopesForRole(role), [role]);

  const [appliedFilters, setAppliedFilters] = useState<ReportFilterValues>(() =>
    filtersFromParams(new URLSearchParams(searchParams?.toString() ?? ''), allowedScopes)
  );
  const [pendingFilters, setPendingFilters] = useState<ReportFilterValues>(() =>
    filtersFromParams(new URLSearchParams(searchParams?.toString() ?? ''), allowedScopes)
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
    const rawScope = params.get('scope');
    let changed = false;
    if (!rawScope || !allowedScopes.includes(rawScope as ReportScope)) {
      params.set('scope', allowedScopes[0] ?? 'course');
      params.delete('id');
      changed = true;
    }
    if (!params.get('period')) {
      params.set('period', 'all');
      changed = true;
    }
    const next = params.toString();
    const current = searchParams?.toString() ?? '';
    if (changed && next !== current) {
      scheduleRouterReplace(router, `/dashboard/reports?${next}`, { scroll: false });
    }
  }, [router, searchParams, allowedScopes]);

  useEffect(() => {
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    const fromUrl = filtersFromParams(
      new URLSearchParams(searchParams?.toString() ?? ''),
      allowedScopes
    );
    setAppliedFilters(fromUrl);
    setPendingFilters(fromUrl);
  }, [searchParams, allowedScopes]);

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

  // Teacher "My activity" is always a single row (self) — open the detail directly.
  useEffect(() => {
    if (role !== 'TEACHER' || scope !== 'teacher' || subjectId) return;
    const rows = listQuery.data?.rows;
    if (!rows || rows.length !== 1) return;
    const id = rows[0]?.id;
    if (id == null) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('scope', 'teacher');
    params.set('id', String(id));
    if (!params.get('period')) params.set('period', appliedResolved.period);
    scheduleRouterReplace(router, `/dashboard/reports?${params.toString()}`, { scroll: false });
  }, [
    role,
    scope,
    subjectId,
    listQuery.data?.rows,
    searchParams,
    router,
    appliedResolved.period
  ]);

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    mutate(params);
    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false });
  };

  const applyFilters = (filters: ReportFilterValues) => {
    skipUrlSyncRef.current = true;
    replaceParams((params) => {
      // Never let a stale pending scope rewrite the URL while a detail id is
      // open — that mixed teacher id=373 with scope=course and crashed Prisma
      // on CourseOffering.publicId (UUID).
      const urlScope = searchParams?.get('scope');
      const scopeToKeep =
        subjectId && urlScope ? urlScope : filters.scope;
      params.set('scope', scopeToKeep);
      if (subjectId) params.set('id', subjectId);

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

    // Keep scope aligned with the open report (URL / applied), not a stale pending tab.
    const urlScope = parseReportScope(
      searchParams?.get('scope') ?? appliedFilters.scope,
      allowedScopes
    );
    filters = { ...filters, scope: urlScope };

    setAppliedFilters(filters);
    setPendingFilters(filters);
    applyFilters(filters);
    // Targeted invalidation only — invalidating every entity report races the
    // list + detail force-refetches and can park a refresh error on top of
    // data that already loaded successfully.
    if (subjectId) {
      void queryClient.invalidateQueries({
        queryKey: [...entityReportKeys.all, 'detail', urlScope, subjectId]
      });
    } else {
      void queryClient.invalidateQueries({ queryKey: entityReportKeys.all });
    }
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
          dateWindow={windowParams}
          onBack={closeDetail}
          filtersPanel={filtersPanel}
          isGenerating={false}
        />
      </div>
    );
  }

  const meta = REPORT_SCOPE_META[scope];
  const pageTitle =
    role === 'TEACHER' ? 'My course activity reports' : 'LMS activity reports';

  return (
    <div className='flex flex-col gap-4'>
      <div className='space-y-1'>
        <h1 className={TITLE_LG}>{pageTitle}</h1>
        <p className='text-sm text-muted-foreground'>{meta.blurb}</p>
      </div>

      <ReportScopeTabs scope={scope} allowedScopes={allowedScopes} />

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
