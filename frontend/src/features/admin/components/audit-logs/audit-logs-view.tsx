'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  User,
} from 'lucide-react';
import {
  useAdminAuditActors,
  useAdminAuditLogs,
  useAdminAuditStats,
} from '@/features/admin/api/queries';
import type {
  AdminAuditLogFilters,
  AuditActionType,
  AuditModule,
  AuditSeverity,
  AuditStatus,
  PlatformAuditLogEntry,
} from '@/features/admin/api/admin-api';
import { AuditLogDetailSheet } from '@/features/admin/components/audit-logs/audit-log-detail-sheet';
import {
  downloadAuditCsv,
  downloadAuditExcel,
  printAuditPdf,
} from '@/features/admin/components/audit-logs/export-audit-logs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

export interface AuditLogFilterState {
  search: string;
  actorId: number | null;
  actionType: AuditActionType;
  module: AuditModule;
  severity: AuditSeverity;
  status: AuditStatus;
  period: '7d' | '30d' | '90d' | 'all';
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: AuditLogFilterState = {
  search: '',
  actorId: null,
  actionType: 'all',
  module: 'all',
  severity: 'all',
  status: 'all',
  period: '30d',
  page: 1,
  pageSize: 25,
};

function periodToDateRange(period: AuditLogFilterState['period']) {
  if (period === 'all') return { dateFrom: null, dateTo: null };
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { dateFrom: from.toISOString(), dateTo: null };
}

export function auditFiltersToQuery(state: AuditLogFilterState): AdminAuditLogFilters {
  const { dateFrom, dateTo } = periodToDateRange(state.period);
  return {
    module: state.module,
    actionType: state.actionType,
    severity: state.severity,
    status: state.status,
    page: state.page,
    pageSize: state.pageSize,
    dateFrom,
    dateTo,
    search: state.search.trim() || null,
    actorId: state.actorId,
  };
}

function userInitials(name: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

const severityStyles: Record<PlatformAuditLogEntry['severity'], string> = {
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  error: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

const actionStyles: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  approve: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  reject: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
};

const AUDIT_MODULE_TABS: { id: AuditModule; label: string }[] = [
  { id: 'all', label: 'All activity' },
  { id: 'Announcements', label: 'Announcements' },
  { id: 'Discussions', label: 'Discussions' },
  { id: 'Clubs', label: 'Clubs' },
  { id: 'Notifications', label: 'Notifications' },
];

function AuditModuleTabNav({
  active,
  onChange,
}: {
  active: AuditModule;
  onChange: (module: AuditModule) => void;
}) {
  return (
    <nav
      aria-label='Audit log modules'
      className='-mb-px w-full min-w-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    >
      <div className='flex w-max min-w-0'>
        {AUDIT_MODULE_TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type='button'
              role='tab'
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function StatChip({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <span className='text-muted-foreground whitespace-nowrap text-xs sm:text-sm'>
      {loading ? (
        <Skeleton className='inline-block h-4 w-10 align-middle' />
      ) : (
        <strong className='text-foreground mr-1 font-semibold tabular-nums'>{value.toLocaleString()}</strong>
      )}
      {label}
    </span>
  );
}

export function AuditLogsView() {
  const [filters, setFilters] = useState<AuditLogFilterState>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailEntry, setDetailEntry] = useState<PlatformAuditLogEntry | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const queryFilters = useMemo(() => auditFiltersToQuery(filters), [filters]);
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAdminAuditLogs(queryFilters);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminAuditStats();
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

  const applyFilters = () => {
    setFilters({ ...draft, page: 1 });
  };

  const resetFilters = () => {
    setDraft(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setSelected(new Set());
  };

  const refreshAll = () => {
    void refetch();
    void refetchStats();
  };

  const copyLogId = (id: string) => {
    void navigator.clipboard.writeText(id);
    showToast('success', 'Log ID copied');
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

  const activeModuleLabel =
    AUDIT_MODULE_TABS.find((tab) => tab.id === filters.module)?.label ?? 'All activity';

  const showModuleColumn = filters.module === 'all';

  const hasActiveFilters =
    filters.search ||
    filters.actorId != null ||
    filters.actionType !== 'all' ||
    filters.module !== 'all' ||
    filters.severity !== 'all' ||
    filters.status !== 'all' ||
    filters.period !== '30d';

  return (
    <div className='grid h-[calc(100dvh-var(--header-height)-0.5rem)] max-h-[calc(100dvh-var(--header-height)-0.5rem)] min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1.5 overflow-hidden md:h-[calc(100dvh-var(--header-height)-0.75rem)] md:max-h-[calc(100dvh-var(--header-height)-0.75rem)]'>
      {/* Compact header with inline stats */}
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2'>
        <h1 className='text-lg font-semibold tracking-tight sm:text-xl'>Audit Logs</h1>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          <StatChip label='total' value={stats?.totalEvents ?? 0} loading={statsLoading} />
          <StatChip label='today' value={stats?.todayActivities ?? 0} loading={statsLoading} />
          <StatChip label='failed' value={stats?.failedActions ?? 0} loading={statsLoading} />
          <StatChip label='critical' value={stats?.criticalEvents ?? 0} loading={statsLoading} />
          <StatChip label='active users' value={stats?.activeUsersToday ?? 0} loading={statsLoading} />
        </div>
        <div className='flex flex-wrap items-center gap-1.5'>
          <Button type='button' variant='outline' size='sm' onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className={cn('mr-1.5 size-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' size='sm'>
                <Download className='mr-1.5 size-3.5' />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-52'>
              <DropdownMenuLabel>Export scope</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadAuditCsv(exportRows)}>
                <FileText className='mr-2 size-4' />
                {selected.size ? 'Selected rows (CSV)' : 'Current page (CSV)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadAuditExcel(exportRows)}>
                <FileSpreadsheet className='mr-2 size-4' />
                {selected.size ? 'Selected rows (Excel)' : 'Current page (Excel)'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => printAuditPdf(exportRows)}>
                <FileText className='mr-2 size-4' />
                Print / PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type='button'
            variant={showAdvanced ? 'default' : 'secondary'}
            size='sm'
            onClick={() => setShowAdvanced((v) => !v)}
          >
            <Search className='mr-1.5 size-3.5' />
            Filters
          </Button>
        </div>
      </div>

      {/* Tab panel — uses almost the full viewport */}
      <div className='flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm'>
        {showAdvanced || hasActiveFilters ? (
          <div className='shrink-0 border-b p-2'>
            <div className='flex flex-wrap items-end gap-2'>
              <div className='min-w-[180px] flex-1'>
                <label className='text-muted-foreground mb-1 block text-xs font-medium'>Search</label>
                <Input
                  value={draft.search}
                  onChange={(e) => setDraft({ ...draft, search: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder='Search actions, users, modules…'
                  className='h-8'
                />
              </div>
              <div className='w-[150px]'>
                <label className='text-muted-foreground mb-1 block text-xs font-medium'>User</label>
                <Select
                  value={draft.actorId != null ? String(draft.actorId) : 'all'}
                  onValueChange={(v) =>
                    setDraft({ ...draft, actorId: v === 'all' ? null : Number(v) })
                  }
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue placeholder='All users' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All users</SelectItem>
                    {(actorsData?.results ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-[130px]'>
                <label className='text-muted-foreground mb-1 block text-xs font-medium'>Action</label>
                <Select
                  value={draft.actionType}
                  onValueChange={(v) => setDraft({ ...draft, actionType: v as AuditActionType })}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['all', 'create', 'update', 'delete', 'approve', 'reject', 'export', 'import'].map(
                      (v) => (
                        <SelectItem key={v} value={v} className='capitalize'>
                          {v === 'all' ? 'All actions' : v}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-[120px]'>
                <label className='text-muted-foreground mb-1 block text-xs font-medium'>Severity</label>
                <Select
                  value={draft.severity}
                  onValueChange={(v) => setDraft({ ...draft, severity: v as AuditSeverity })}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['all', 'info', 'warning', 'error', 'critical'].map((v) => (
                      <SelectItem key={v} value={v} className='capitalize'>
                        {v === 'all' ? 'All levels' : v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='w-[110px]'>
                <label className='text-muted-foreground mb-1 block text-xs font-medium'>Status</label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as AuditStatus })}
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All status</SelectItem>
                    <SelectItem value='success'>Success</SelectItem>
                    <SelectItem value='failed'>Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='w-[130px]'>
                <label className='text-muted-foreground mb-1 block text-xs font-medium'>Date range</label>
                <Select
                  value={draft.period}
                  onValueChange={(v) =>
                    setDraft({ ...draft, period: v as AuditLogFilterState['period'] })
                  }
                >
                  <SelectTrigger className='h-8'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='7d'>Last 7 days</SelectItem>
                    <SelectItem value='30d'>Last 30 days</SelectItem>
                    <SelectItem value='90d'>Last 90 days</SelectItem>
                    <SelectItem value='all'>All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type='button' size='sm' className='h-8' onClick={applyFilters}>
                Apply
              </Button>
              {hasActiveFilters ? (
                <Button type='button' variant='ghost' size='sm' className='h-8' onClick={resetFilters}>
                  <RotateCcw className='mr-1.5 size-3.5' />
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className='flex shrink-0 items-center gap-2 border-b px-3'>
          <div className='min-w-0 flex-1'>
            <AuditModuleTabNav active={filters.module} onChange={handleModuleTab} />
          </div>
          {!showAdvanced && !hasActiveFilters ? (
            <Input
              value={draft.search}
              onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
              placeholder='Quick search…'
              className='h-8 w-40 shrink-0 sm:w-52'
            />
          ) : null}
        </div>

        {error ? (
          <div className='shrink-0 border-b border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error.message}
          </div>
        ) : null}

        <div className='relative min-h-0 flex-1 overflow-hidden'>
          {isLoading && rows.length === 0 ? (
            <div className='absolute inset-0 space-y-2 overflow-y-auto p-4'>
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className='h-11 w-full rounded-lg' />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center'>
              <div className='flex size-14 items-center justify-center rounded-2xl bg-muted'>
                <AlertTriangle className='text-muted-foreground size-6' />
              </div>
              <div>
                <p className='font-medium'>No audit records found.</p>
                <p className='text-muted-foreground mt-1 max-w-md text-sm'>
                  {filters.module === 'all'
                    ? 'System activities will appear here once users start interacting with the platform.'
                    : `No ${activeModuleLabel.toLowerCase()} events match your current filters.`}
                </p>
              </div>
            </div>
          ) : (
            <div className='absolute inset-0 overflow-x-auto overflow-y-auto overscroll-contain'>
              <Table className='w-full min-w-0'>
                <TableHeader className='sticky top-0 z-10 bg-card shadow-sm [&_tr]:border-b'>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='bg-card w-10'>
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label='Select all' />
                    </TableHead>
                    <TableHead className='bg-card w-[128px]'>Timestamp</TableHead>
                    <TableHead className='bg-card min-w-[160px]'>User</TableHead>
                    <TableHead className='bg-card w-[100px]'>Action</TableHead>
                    {showModuleColumn ? (
                      <TableHead className='bg-card w-[110px]'>Module</TableHead>
                    ) : null}
                    <TableHead className='bg-card min-w-[180px]'>Description</TableHead>
                    <TableHead className='bg-card w-[100px]'>IP address</TableHead>
                    <TableHead className='bg-card w-[88px]'>Severity</TableHead>
                    <TableHead className='bg-card w-[80px]'>Status</TableHead>
                    <TableHead className='bg-card w-10' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                {rows.map((entry) => {
                  const ts = formatTimestamp(entry.createdAt);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(entry.id)}
                          onCheckedChange={() => toggleRow(entry.id)}
                          aria-label={`Select log ${entry.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className='text-xs leading-tight'>
                          <div className='font-medium'>{ts.date}</div>
                          <div className='text-muted-foreground'>{ts.time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-2'>
                          <Avatar className='size-8'>
                            <AvatarFallback className='text-[10px]'>
                              {userInitials(entry.actorName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>{entry.actorName ?? 'System'}</p>
                            <p className='text-muted-foreground truncate text-xs'>
                              {entry.actorEmail ?? '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant='secondary'
                          className={cn(
                            'font-normal capitalize',
                            actionStyles[entry.actionType] ?? ''
                          )}
                        >
                          {entry.actionLabel}
                        </Badge>
                      </TableCell>
                      {showModuleColumn ? (
                        <TableCell className='text-muted-foreground text-sm'>{entry.module}</TableCell>
                      ) : null}
                      <TableCell className='max-w-[280px] truncate text-sm' title={entry.description}>
                        {entry.description}
                      </TableCell>
                      <TableCell className='text-muted-foreground font-mono text-xs'>
                        {entry.ipAddress ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('capitalize', severityStyles[entry.severity])}>
                          {entry.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'success' ? 'outline' : 'destructive'}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type='button' variant='ghost' size='icon' className='size-8'>
                              <MoreHorizontal className='size-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={() => setDetailEntry(entry)}>
                              <Eye className='mr-2 size-4' />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => copyLogId(entry.id)}>
                              <ClipboardCopy className='mr-2 size-4' />
                              Copy log ID
                            </DropdownMenuItem>
                            {entry.actorId ? (
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/users`}>
                                  <User className='mr-2 size-4' />
                                  View user profile
                                </Link>
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className='flex shrink-0 flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-muted-foreground text-sm'>
          {selected.size > 0 ? `${selected.size} selected · ` : ''}
          {total === 0
            ? 'No entries'
            : `Showing ${showingFrom}–${showingTo} of ${total.toLocaleString()}`}
        </p>
        <div className='flex items-center gap-2'>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => setFilters({ ...filters, pageSize: Number(v), page: 1 })}
          >
            <SelectTrigger size='sm' className='w-[110px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[15, 25, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            disabled={page <= 1}
            onClick={() => setFilters({ ...filters, page: page - 1 })}
          >
            <ChevronLeft className='size-4' />
          </Button>
          <span className='text-muted-foreground min-w-[88px] text-center text-sm'>
            Page {page} of {pageCount}
          </span>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-8'
            disabled={page >= pageCount}
            onClick={() => setFilters({ ...filters, page: page + 1 })}
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
        </div>
      </div>

      <AuditLogDetailSheet
        entry={detailEntry}
        open={detailEntry != null}
        onOpenChange={(open) => !open && setDetailEntry(null)}
      />
    </div>
  );
}
