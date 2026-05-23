'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users } from 'lucide-react';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';
import { SimpleDataTable } from './_shared/simple-data-table';
import { StudentProfileDrawer } from './student-profile-drawer';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { useRoster } from '../api/roster-queries';
import { useCourseAccessList } from '../api/access-queries';
import { useAttendanceSummary } from '../api/attendance-queries';
import type { RosterStudent } from '../api/roster-types';

interface CourseRosterProps {
  courseId: string;
}

interface RosterRow extends RosterStudent {
  /// Joined onto each student so the table can sort/filter on them as if
  /// they were native columns.
  lastSeenAt: string | null;
  attendanceRate: number | null;
}

export function CourseRoster({ courseId }: CourseRosterProps) {
  const [selected, setSelected] = useState<RosterStudent | null>(null);
  const { data: roster = [], isLoading, isError } = useRoster(courseId);
  const { data: accessRows = [] } = useCourseAccessList(courseId);
  const { data: summary } = useAttendanceSummary(courseId);

  const rows: RosterRow[] = useMemo(() => {
    const lastSeen = new Map(accessRows.map((r) => [r.userId, r.lastSeenAt]));
    const rate = new Map(summary?.students.map((s) => [s.studentId, s.ratePct]) ?? []);
    return roster.map((s) => ({
      ...s,
      lastSeenAt: lastSeen.get(s.id) ?? null,
      attendanceRate: rate.get(s.id) ?? null
    }));
  }, [roster, accessRows, summary]);

  const columns = useMemo<ColumnDef<RosterRow, unknown>[]>(
    () => [
      {
        id: 'full_name',
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => {
          const r = row.original;
          const atRisk = typeof r.attendanceRate === 'number' && r.attendanceRate < 60;
          return (
            <span className='flex items-center gap-2 font-medium'>
              {atRisk && (
                <AlertTriangle
                  className='w-3.5 h-3.5 text-destructive'
                  aria-label='At risk'
                />
              )}
              {r.full_name}
            </span>
          );
        }
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <a
            href={`mailto:${row.original.email}`}
            onClick={(e) => e.stopPropagation()}
            className='text-muted-foreground hover:underline'
          >
            {row.original.email}
          </a>
        )
      },
      {
        id: 'number',
        accessorKey: 'number',
        header: 'Student ID',
        cell: ({ row }) => (
          <span className='text-muted-foreground'>{row.original.number}</span>
        )
      },
      {
        id: 'lastSeenAt',
        accessorKey: 'lastSeenAt',
        header: 'Last seen',
        // Sort by raw timestamp; display as relative time with absolute tooltip.
        sortingFn: (a, b) => {
          const av = a.original.lastSeenAt ? new Date(a.original.lastSeenAt).getTime() : 0;
          const bv = b.original.lastSeenAt ? new Date(b.original.lastSeenAt).getTime() : 0;
          return av - bv;
        },
        cell: ({ row }) => {
          const ts = row.original.lastSeenAt;
          if (!ts) return <Badge variant='secondary'>Never</Badge>;
          return (
            <span title={new Date(ts).toLocaleString()}>
              {formatDistanceToNow(new Date(ts), { addSuffix: true })}
            </span>
          );
        }
      },
      {
        id: 'attendanceRate',
        accessorKey: 'attendanceRate',
        header: 'Attendance',
        cell: ({ row }) => {
          const rate = row.original.attendanceRate;
          if (typeof rate !== 'number')
            return <span className='text-muted-foreground text-xs'>—</span>;
          return (
            <Badge
              variant={rate >= 80 ? 'default' : rate >= 60 ? 'outline' : 'destructive'}
            >
              {rate}%
            </Badge>
          );
        }
      }
    ],
    []
  );

  return (
    <div className='space-y-4'>
      {isLoading && <ListSkeleton variant='row' count={5} />}
      {isError && <p className='text-sm text-destructive'>Failed to load the roster.</p>}
      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title='No students yet'
          description='Students assigned to this section will appear here once they enrol.'
        />
      )}

      {rows.length > 0 && (
        <SimpleDataTable
          data={rows}
          columns={columns}
          searchPlaceholder='Search students…'
          csvFileName={`roster-${courseId}`}
          initialSorting={[{ id: 'full_name', desc: false }]}
          pageSize={50}
          onRowClick={(r) => setSelected(r)}
        />
      )}

      <StudentProfileDrawer
        courseId={courseId}
        student={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
