'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  useAdminAuditActors,
  useAdminAuditLogs,
  useAdminAuditStats,
} from '@/lib/admin/queries';
import type { AuditModule, PlatformAuditLogEntry } from '@/lib/admin/services';
import { showToast } from '@/lib/notifications';
import {
  auditFiltersToQuery,
  DEFAULT_FILTERS,
  hasActiveAuditFilters,
  type AuditLogFilterState,
} from './audit-filters';
import { AUDIT_MODULE_TABS } from './audit-module-tabs';
import { AUDIT_ALL_COLS, type AuditColumnId } from './audit-table-utils';

export function useAuditLogsView() {
  const [filters, setFilters] = useState<AuditLogFilterState>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailEntry, setDetailEntry] = useState<PlatformAuditLogEntry | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibleCols, setVisibleCols] = useState<AuditColumnId[]>([...AUDIT_ALL_COLS]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: deferredSearch, page: 1 }));
    setDraft((prev) => ({ ...prev, search: deferredSearch }));
  }, [deferredSearch]);

  const queryFilters = useMemo(() => auditFiltersToQuery(filters), [filters]);
  const { data, isLoading, error, refetch } = useAdminAuditLogs(queryFilters);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } =
    useAdminAuditStats();
  const { data: actorsData } = useAdminAuditActors();

  const rows = data?.results ?? [];
  const total = data?.totalCount ?? data?.total ?? 0;
  const page = data?.page ?? filters.page;
  const pageSize = data?.pageSize ?? filters.pageSize;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const exportRows = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
  const hasActiveFilters = hasActiveAuditFilters(filters);
  const activeModuleLabel =
    AUDIT_MODULE_TABS.find((tab) => tab.id === filters.module)?.label ?? 'All activity';

  const applyFilters = () => setFilters({ ...draft, page: 1 });

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setSelected(new Set());
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleModuleTab = (module: AuditModule) => {
    setFilters((prev) => ({ ...prev, module, page: 1 }));
    setDraft((prev) => ({ ...prev, module }));
    setSelected(new Set());
  };

  const copyLogId = (id: string) => {
    void navigator.clipboard.writeText(id);
    showToast('success', 'Log ID copied');
  };

  return {
    filters,
    setFilters,
    draft,
    setDraft,
    search,
    setSearch,
    selected,
    detailEntry,
    setDetailEntry,
    showAdvanced,
    setShowAdvanced,
    visibleCols,
    setVisibleCols,
    rows,
    total,
    page,
    pageSize,
    pageCount,
    showingFrom,
    showingTo,
    allSelected,
    exportRows,
    hasActiveFilters,
    activeModuleLabel,
    showModuleColumn: filters.module === 'all',
    isLoading,
    error,
    stats,
    statsLoading,
    actors: actorsData?.results ?? [],
    applyFilters,
    resetFilters,
    refreshAll: () => {
      void refetch();
      void refetchStats();
    },
    toggleAll,
    toggleRow,
    handleModuleTab,
    copyLogId,
  };
}
