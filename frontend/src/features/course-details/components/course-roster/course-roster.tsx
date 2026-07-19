'use client';

import { useMemo, useState } from 'react';
import { Activity, UserCheck, Users } from 'lucide-react';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { SimpleDataTable } from '../_shared/simple-data-table';
import { CoursePageShell } from '../_shared/course-page-shell';
import { StudentProfileDrawer } from '../student-profile-drawer';
import { useRoster } from '../../api/roster-queries';
import { useCourseAccessList } from '../../api/access-queries';
import type { RosterStudent } from '../../api/roster-types';
import { computeRosterStats, type RosterRow } from './helpers';
import { StatCard } from './stat-card';
import { useRosterColumns } from './use-roster-columns';

interface CourseRosterProps {
  courseId: string;
}

export function CourseRoster({ courseId }: CourseRosterProps) {
  const [selected, setSelected] = useState<RosterStudent | null>(null);
  const { data: roster = [], isLoading, isError } = useRoster(courseId);
  const { data: accessRows = [] } = useCourseAccessList(courseId);
  const columns = useRosterColumns();

  const rows: RosterRow[] = useMemo(() => {
    const lastSeen = new Map(accessRows.map((r) => [r.userId, r.lastSeenAt]));
    return roster.map((s) => ({
      ...s,
      lastSeenAt: lastSeen.get(s.id) ?? null
    }));
  }, [roster, accessRows]);

  const stats = useMemo(() => computeRosterStats(rows), [rows]);

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
