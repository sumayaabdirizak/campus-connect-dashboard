'use client';

import { useMemo, useState, type ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity, UserCheck, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { SimpleDataTable } from './_shared/simple-data-table';
import { CoursePageShell } from './_shared/course-page-shell';
import { StudentProfileDrawer } from './student-profile-drawer';
import { useRoster } from '../api/roster-queries';
import { useCourseAccessList } from '../api/access-queries';
import type { RosterStudent } from '../api/roster-types';

interface CourseRosterProps {
  courseId: string;
}

interface RosterRow extends RosterStudent {
  lastSeenAt: string | null;
}

const ACTIVE_MS = 7 * 24 * 60 * 60 * 1000;

function studentInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className='flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-3 sm:px-4'>
      <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
        <Icon className='size-4' aria-hidden />
      </div>
      <div className='min-w-0'>
        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
          {label}
        </p>
        <p className='text-sm font-semibold tabular-nums text-foreground'>{value}</p>
        {sub ? <p className='truncate text-xs text-muted-foreground'>{sub}</p> : null}
      </div>
    </div>
  );
}

function StudentNameCell({ name, number }: { name: string; number: string }) {
  return (
    <div className='flex min-w-0 items-center gap-2.5'>
      <div
        className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary'
        aria-hidden
      >
        {studentInitials(name) || '?'}
      </div>
      <div className='min-w-0'>
        <p className='truncate text-sm font-medium'>{name}</p>
        <p className='select-text truncate text-[11px] text-muted-foreground'>{number}</p>
      </div>
    </div>
  );
}

export function CourseRoster({ courseId }: CourseRosterProps) {
  const [selected, setSelected] = useState<RosterStudent | null>(null);
  const { data: roster = [], isLoading, isError } = useRoster(courseId);
  const { data: accessRows = [] } = useCourseAccessList(courseId);

  const rows: RosterRow[] = useMemo(() => {
    const lastSeen = new Map(accessRows.map((r) => [r.userId, r.lastSeenAt]));
    return roster.map((s) => ({
      ...s,
      lastSeenAt: lastSeen.get(s.id) ?? null
    }));
  }, [roster, accessRows]);

  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let never = 0;
    for (const row of rows) {
      if (!row.lastSeenAt) {
        never += 1;
        continue;
      }
      if (now - new Date(row.lastSeenAt).getTime() <= ACTIVE_MS) {
        active += 1;
      }
    }
    return { total: rows.length, active, never };
  }, [rows]);

  const columns = useMemo<ColumnDef<RosterRow, unknown>[]>(
    () => [
      {
        id: 'full_name',
        accessorKey: 'full_name',
        header: 'Student',
        cell: ({ row }) => (
          <StudentNameCell name={row.original.full_name} number={row.original.number} />
        )
      },
      {
        id: 'number',
        accessorKey: 'number',
        header: 'Student ID',
        cell: ({ row }) => (
          <span className='text-sm tabular-nums text-muted-foreground'>{row.original.number}</span>
        )
      },
      {
        id: 'lastSeenAt',
        accessorKey: 'lastSeenAt',
        header: 'Last seen',
        sortingFn: (a, b) => {
          const av = a.original.lastSeenAt ? new Date(a.original.lastSeenAt).getTime() : 0;
          const bv = b.original.lastSeenAt ? new Date(b.original.lastSeenAt).getTime() : 0;
          return av - bv;
        },
        cell: ({ row }) => {
          const ts = row.original.lastSeenAt;
          if (!ts) {
            return (
              <Badge variant='secondary' className='font-normal'>
                Never
              </Badge>
            );
          }
          const recent = Date.now() - new Date(ts).getTime() <= ACTIVE_MS;
          return (
            <div className='flex flex-col gap-0.5'>
              <span className='text-sm' title={new Date(ts).toLocaleString()}>
                {formatDistanceToNow(new Date(ts), { addSuffix: true })}
              </span>
              {recent ? (
                <Badge variant='outline' className='w-fit text-[10px] text-emerald-700'>
                  Active
                </Badge>
              ) : null}
            </div>
          );
        }
      }
    ],
    []
  );

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <ListSkeleton key={i} variant='row' count={1} />
          ))}
        </div>
        <ListSkeleton variant='row' count={5} />
      </div>
    );
  }

  if (isError) {
    return (
      <CoursePageShell title='Roster'>
        <EmptyState
          icon={Users}
          title='Could not load roster'
          description='Something went wrong fetching students. Try reloading the page.'
        />
      </CoursePageShell>
    );
  }

  if (rows.length === 0) {
    return (
      <CoursePageShell title='Roster' description='Students enrolled in this section.'>
        <EmptyState
          icon={Users}
          title='No students yet'
          description='Students assigned to this section will appear here once they enrol.'
        />
      </CoursePageShell>
    );
  }

  return (
    <div className='flex min-h-0 flex-col gap-4'>
      <div className='grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-3'>
        <StatCard label='Enrolled' value={String(stats.total)} icon={Users} />
        <StatCard
          label='Active'
          value={String(stats.active)}
          sub='Seen in the last 7 days'
          icon={Activity}
        />
        <StatCard
          label='Not seen'
          value={String(stats.never)}
          sub='Never opened this course'
          icon={UserCheck}
        />
      </div>

      <CoursePageShell
        title='Student roster'
        description={`${stats.total} enrolled`}
        flush
        className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
      >
        <div className='flex min-h-0 flex-1 flex-col px-4 pt-4 sm:px-6'>
          <SimpleDataTable
            embedded
            data={rows}
            columns={columns}
            searchPlaceholder='Search students…'
            csvFileName={`roster-${courseId}`}
            initialSorting={[{ id: 'full_name', desc: false }]}
            pageSize={50}
            onRowClick={(r) => setSelected(r)}
            mobilePrimaryColumn='full_name'
            stickyHeader
            scrollContainerClassName='max-h-[min(720px,calc(100dvh-18rem))] min-h-[200px] overflow-auto'
          />
        </div>
        <p className='border-t border-border/60 px-4 py-3 text-[11px] text-muted-foreground sm:px-6'>
          Last seen is based on course page visits.
        </p>
      </CoursePageShell>

      <StudentProfileDrawer
        courseId={courseId}
        student={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
