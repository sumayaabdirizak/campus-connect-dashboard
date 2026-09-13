'use client';

import { useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@/lib/async-query';
import { fetchAllFaculties } from '@/lib/faculties/faculty-list';
import { useClubsReport } from '@/lib/dean/queries';
import { SearchSelect } from '@/components/ui/search-select';
import type { ClubReportRow } from '@/lib/dean/types';

function ClubsTable({ title, rows }: { title: string; rows: ClubReportRow[] }) {
  return (
    <div className='rounded-xl border bg-card p-4'>
      <h3 className='mb-3 text-sm font-semibold'>{title}</h3>
      {rows.length ? (
        <div className='space-y-2'>
          {rows.map((c) => (
            <div
              key={c.id}
              className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
            >
              <div className='flex items-center gap-3'>
                <span className='text-muted-foreground w-5 text-right text-xs font-semibold tabular-nums'>
                  {c.rank}
                </span>
                <div>
                  <p className='font-medium'>{c.name}</p>
                  <p className='text-muted-foreground text-xs'>
                    {c.facultyName ?? 'Unscoped'} · {c.status}
                  </p>
                </div>
              </div>
              <div className='text-right text-xs'>
                <p className='font-semibold tabular-nums'>{c.memberCount} members</p>
                {c.lastActivityAt ? (
                  <p className='text-muted-foreground'>
                    Active {new Date(c.lastActivityAt).toLocaleDateString()}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className='text-muted-foreground text-sm'>No data</p>
      )}
    </div>
  );
}

export function ClubsReportView() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [facultyId, setFacultyId] = useState<number | null>(null);

  const { data: faculties } = useQuery({
    queryKey: ['faculties', 'all-for-report-picker'],
    queryFn: fetchAllFaculties,
    enabled: isSuperAdmin,
  });

  const params = useMemo<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    if (isSuperAdmin && facultyId != null) p.facultyId = String(facultyId);
    return p;
  }, [isSuperAdmin, facultyId]);

  const { data, isLoading, error } = useClubsReport(params);

  return (
    <div className='space-y-4'>
      {isSuperAdmin ? (
        <div className='flex items-center gap-2 rounded-xl border bg-card p-3'>
          <span className='text-muted-foreground text-sm font-medium'>Faculty:</span>
          <SearchSelect
            value={facultyId ? String(facultyId) : ''}
            onValueChange={(val) => setFacultyId(val ? Number(val) : null)}
            options={(faculties ?? []).map((f) => ({ value: String(f.id), label: f.name }))}
            placeholder='All faculties'
            className='max-w-xs'
          />
        </div>
      ) : null}

      {error ? (
        <div className='rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error.message}
        </div>
      ) : null}

      {isLoading ? (
        <div className='text-muted-foreground rounded-xl border bg-card p-6 text-center text-sm'>
          Loading clubs report…
        </div>
      ) : (
        <>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
            {[
              ['Total clubs', data?.summary.totalClubs],
              ['Active', data?.summary.activeClubs],
              ['Pending approval', data?.summary.pendingApprovalClubs],
              ['Total members', data?.summary.totalMembers],
              ['Join requests', data?.summary.totalJoinRequests],
            ].map(([label, value]) => (
              <div key={label as string} className='rounded-xl border bg-card p-3 text-center'>
                <p className='text-2xl font-semibold tabular-nums'>{value ?? 0}</p>
                <p className='text-muted-foreground text-xs'>{label}</p>
              </div>
            ))}
          </div>

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <ClubsTable title='Top clubs by members' rows={data?.topClubsByMembers ?? []} />
            <ClubsTable title='Most active clubs' rows={data?.mostActiveClubs ?? []} />
          </div>

          {data?.byFaculty?.length ? (
            <div className='rounded-xl border bg-card p-4'>
              <h3 className='mb-3 text-sm font-semibold'>Clubs by faculty</h3>
              <div className='space-y-2'>
                {data.byFaculty.map((f) => (
                  <div
                    key={f.facultyId ?? 'unscoped'}
                    className='flex items-center justify-between rounded-lg border px-3 py-2 text-sm'
                  >
                    <p className='font-medium'>{f.facultyName}</p>
                    <p className='text-muted-foreground text-xs'>
                      {f.clubCount} clubs · {f.memberCount} members
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
