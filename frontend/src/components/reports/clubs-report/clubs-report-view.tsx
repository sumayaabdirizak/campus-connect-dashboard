'use client';

import { useMemo, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@/lib/async-query';
import { fetchAllFaculties } from '@/lib/faculties/faculty-list';
import { useClubsReport } from '@/lib/dean/queries';
import { useClubMembers } from '@/lib/clubs/queries';
import { SearchSelect } from '@/components/ui/search-select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  KPI_LABEL,
  KPI_TILE,
  KPI_VALUE,
  META,
  SUBTITLE,
  TITLE_LG
} from '@/components/reports/report-theme';
import {
  GlobalFilterField,
  GlobalReportFilters,
  GLOBAL_FILTER_CONTROL
} from '@/components/reports/global-report-filters';
import {
  exportClubMembersCsv,
  exportClubMembersPdf,
  exportClubsReportListCsv,
  exportClubsReportListPdf
} from './export-clubs-report';
import { showToast } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { ClubReportRow } from '@/lib/dean/types';
import type { ClubMember } from '@/lib/clubs/types';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' }
];

type Filters = {
  facultyId: string;
  status: string;
};

const defaultFilters: Filters = { facultyId: 'all', status: 'all' };

const STORAGE_KEY = 'clubs-report-filters:v1';

function statusClass(status: string): string {
  if (status === 'APPROVED') return 'text-emerald-700 dark:text-emerald-400';
  if (status === 'PENDING') return 'text-amber-700 dark:text-amber-400';
  if (status === 'SUSPENDED' || status === 'REJECTED') return 'text-rose-700 dark:text-rose-400';
  return 'text-muted-foreground';
}

export function ClubsReportView() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim(), 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortId, setSortId] = useState('members-desc');
  const [selectedClub, setSelectedClub] = useState<{ id: number; name: string } | null>(null);
  const [clubPickerValue, setClubPickerValue] = useState('');

  const { data: faculties } = useQuery({
    queryKey: ['faculties', 'all-for-report-picker'],
    queryFn: fetchAllFaculties,
    enabled: isSuperAdmin
  });

  const queryParams = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    if (isSuperAdmin && appliedFilters.facultyId !== 'all') {
      p.facultyId = appliedFilters.facultyId;
    }
    return p;
  }, [isSuperAdmin, appliedFilters.facultyId]);

  const { data, isLoading, isFetching, isError, error, refetch } = useClubsReport(queryParams);
  const showUpdating = isFetching && !isLoading;

  const { data: membersData, isLoading: membersLoading } = useClubMembers(
    selectedClub?.id ?? null
  );
  const selectedClubMembers: ClubMember[] = membersData?.members ?? [];

  const facultyOptions = useMemo(
    () => [
      { value: 'all', label: 'All faculties' },
      ...(faculties ?? []).map((f) => ({ value: String(f.id), label: f.name }))
    ],
    [faculties]
  );

  const clubOptions = useMemo(
    () =>
      (data?.clubs ?? [])
        .map((c) => ({
          value: String(c.id),
          label: c.name,
          sub: c.facultyName ?? 'Unscoped'
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data?.clubs]
  );

  const openClubMembers = (clubId: string) => {
    const club = data?.clubs.find((c) => String(c.id) === clubId);
    if (club) setSelectedClub({ id: club.id, name: club.name });
    setClubPickerValue('');
  };

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    let rows = (data?.clubs ?? []).filter((c) => {
      if (appliedFilters.status !== 'all' && c.status !== appliedFilters.status) return false;
      if (q) {
        const hay = `${c.name} ${c.facultyName ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const [key, dir] = sortId.split('-') as ['name' | 'members' | 'activity', string];
    const mult = dir === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      if (key === 'name') return a.name.localeCompare(b.name) * mult;
      if (key === 'members') return (a.memberCount - b.memberCount) * mult;
      if (key === 'activity') {
        const av = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
        const bv = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
        return (av - bv) * mult;
      }
      return 0;
    });
    return rows;
  }, [data?.clubs, appliedFilters.status, debouncedSearch, sortId]);

  const total = filteredRows.length;
  const pageRows = filteredRows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const exportList = (format: 'pdf' | 'csv') => {
    if (selectedClub) {
      if (format === 'pdf') exportClubMembersPdf(selectedClub.name, selectedClubMembers);
      else exportClubMembersCsv(selectedClub.name, selectedClubMembers);
    } else if (format === 'pdf') {
      exportClubsReportListPdf(filteredRows);
    } else {
      exportClubsReportListCsv(filteredRows);
    }
    showToast('success', format === 'pdf' ? 'Print dialog opened' : 'CSV downloaded');
  };

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className={TITLE_LG}>Clubs report</h1>
          <p className={SUBTITLE}>Membership and activity across all clubs — open one for its members.</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {showUpdating ? (
            <span className='inline-flex items-center gap-1.5 text-sm text-muted-foreground'>
              <RefreshCw className='size-3.5 animate-spin' />
              Updating…
            </span>
          ) : null}
          {selectedClub ? (
            <button
              type='button'
              onClick={() => setSelectedClub(null)}
              className='inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70'
            >
              {selectedClub.name}
              <X className='size-3' />
            </button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size='sm'
                variant='outline'
                disabled={selectedClub ? membersLoading : total === 0}
              >
                <Download className='mr-1.5 size-4' />
                {selectedClub ? `Export ${selectedClub.name}` : 'Export list'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => exportList('pdf')}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportList('csv')}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size='sm' variant='outline' onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={cn('mr-1.5 size-4', isFetching && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <GlobalReportFilters
        description='Filter by faculty and status — then apply.'
        storageKey={isSuperAdmin ? STORAGE_KEY : undefined}
        onLoadTemplate={(raw) => {
          if (!raw || typeof raw !== 'object') return;
          const o = raw as Partial<Filters>;
          setDraftFilters({
            facultyId: typeof o.facultyId === 'string' ? o.facultyId : 'all',
            status: typeof o.status === 'string' ? o.status : 'all'
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
        {isSuperAdmin ? (
          <GlobalFilterField label='Faculty'>
            <SearchSelect
              options={facultyOptions}
              value={draftFilters.facultyId}
              onValueChange={(v) => setDraftFilters((p) => ({ ...p, facultyId: v }))}
              placeholder='Select faculty'
              searchPlaceholder='Search faculties…'
              emptyText='No faculties found.'
              className={cn('w-full', GLOBAL_FILTER_CONTROL)}
            />
          </GlobalFilterField>
        ) : null}

        <GlobalFilterField label='Status'>
          <Select
            value={draftFilters.status}
            onValueChange={(v) => setDraftFilters((p) => ({ ...p, status: v }))}
          >
            <SelectTrigger className={cn('w-full', GLOBAL_FILTER_CONTROL)}>
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </GlobalFilterField>

        <GlobalFilterField label='View club members'>
          <SearchSelect
            options={clubOptions}
            value={clubPickerValue}
            onValueChange={openClubMembers}
            placeholder='Choose a club to export…'
            searchPlaceholder='Search clubs…'
            emptyText='No clubs found.'
            loading={isLoading}
            className={cn('w-full', GLOBAL_FILTER_CONTROL)}
          />
        </GlobalFilterField>
      </GlobalReportFilters>

      {isError ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          Couldn&apos;t load clubs report: {error?.message ?? 'Unknown error'}
        </div>
      ) : null}

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
        {[
          ['Total clubs', data?.summary.totalClubs],
          ['Active', data?.summary.activeClubs],
          ['Pending approval', data?.summary.pendingApprovalClubs],
          ['Total members', data?.summary.totalMembers],
          ['Join requests', data?.summary.totalJoinRequests]
        ].map(([label, value]) => (
          <div key={label as string} className={KPI_TILE}>
            <p className={KPI_VALUE}>{value ?? 0}</p>
            <p className={KPI_LABEL}>{label}</p>
          </div>
        ))}
      </div>

      <PosTableCard
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder='Filter by club or faculty…'
        sortOptions={[
          { id: 'members-desc', label: 'Most members' },
          { id: 'members-asc', label: 'Fewest members' },
          { id: 'name-asc', label: 'Name A–Z' },
          { id: 'name-desc', label: 'Name Z–A' },
          { id: 'activity-desc', label: 'Most recently active' }
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
              itemLabel={total === 1 ? 'club' : 'clubs'}
            />
          ) : null
        }
      >
        <div className='overflow-x-auto'>
          <PosTable>
            <PosTableHead>
              <PosTableRow>
                <PosTableHeaderCell>Club</PosTableHeaderCell>
                <PosTableHeaderCell>Faculty</PosTableHeaderCell>
                <PosTableHeaderCell>Status</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Members</PosTableHeaderCell>
                <PosTableHeaderCell className='text-right'>Pending requests</PosTableHeaderCell>
                <PosTableHeaderCell>Last activity</PosTableHeaderCell>
              </PosTableRow>
            </PosTableHead>
            <PosTableBody>
              {isLoading ? (
                <PosTableRow>
                  <PosTableCell colSpan={6} className={META}>
                    Loading clubs…
                  </PosTableCell>
                </PosTableRow>
              ) : pageRows.length === 0 ? (
                <PosTableRow>
                  <PosTableCell colSpan={6} className={META}>
                    No clubs match these filters.
                  </PosTableCell>
                </PosTableRow>
              ) : (
                pageRows.map((c) => (
                  <PosTableRow
                    key={c.id}
                    className='cursor-pointer hover:bg-muted/40'
                    onClick={() => setSelectedClub({ id: c.id, name: c.name })}
                  >
                    <PosTableCell className={BODY}>{c.name}</PosTableCell>
                    <PosTableCell className={BODY}>{c.facultyName ?? 'Unscoped'}</PosTableCell>
                    <PosTableCell>
                      <span className={cn('text-xs font-medium', statusClass(c.status))}>
                        {c.status}
                      </span>
                    </PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>{c.memberCount}</PosTableCell>
                    <PosTableCell className='text-right tabular-nums'>
                      {c.joinRequests.pending}
                    </PosTableCell>
                    <PosTableCell>
                      {c.lastActivityAt ? new Date(c.lastActivityAt).toLocaleDateString() : '—'}
                    </PosTableCell>
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
