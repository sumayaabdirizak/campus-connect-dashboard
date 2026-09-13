'use client';

import { useMemo, useState } from 'react';
import { Activity, UserCheck, Users } from 'lucide-react';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { CourseTabHeader } from '../_shared/course-tab-header';
import { CourseTabPage } from '../_shared/course-tab-page';
import { QueryErrorState } from '@/components/query-error-state';
import { StudentProfileDrawer } from '../student-profile-drawer';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import { useCourseAccessList } from '@/lib/course-details/queries/access-queries';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';
import { computeRosterStats, type RosterRow } from './helpers';
import { RosterListTable } from './roster-list-table';
import { StatCard } from './stat-card';

interface CourseRosterProps {
  courseId: string;
}

export function CourseRoster({ courseId }: CourseRosterProps) {
  const [selected, setSelected] = useState<RosterStudent | null>(null);
  const [search, setSearch] = useState('');
  const { data: roster = [], isLoading, isError, error, refetch } = useRoster(courseId, {
    live: true
  });
  const { data: accessRows = [] } = useCourseAccessList(courseId);

  const rows: RosterRow[] = useMemo(() => {
    const lastSeen = new Map(accessRows.map((r) => [r.userId, r.lastSeenAt]));
    return roster.map((s) => ({
      ...s,
      lastSeenAt: lastSeen.get(s.id) ?? null
    }));
  }, [roster, accessRows]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(needle) ||
        r.number.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle)
    );
  }, [rows, search]);

  const stats = useMemo(() => computeRosterStats(rows), [rows]);

  if (isLoading) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Student logs'
          description='Students enrolled in this section.'
        />
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <ListSkeleton key={i} variant='row' count={1} />
          ))}
        </div>
        <ListSkeleton variant='row' count={5} />
      </CourseTabPage>
    );
  }

  if (isError) {
    return (
      <CourseTabPage>
        <CourseTabHeader title='Student logs' description='Students enrolled in this section.' />
        <QueryErrorState
          title='Could not load roster'
          message={error?.message || 'Try reloading the page.'}
          onRetry={() => void refetch()}
        />
      </CourseTabPage>
    );
  }

  if (rows.length === 0) {
    return (
      <CourseTabPage>
        <CourseTabHeader title='Student logs' description='Students enrolled in this section.' />
        <EmptyState
          icon={Users}
          title='No students yet'
          description='Students assigned to this section will appear here once they enrol.'
        />
      </CourseTabPage>
    );
  }

  return (
    <CourseTabPage>
      <CourseTabHeader
        title='Student logs'
        description={`${stats.total} enrolled · last seen based on course page visits.`}
      />

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
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

      <div className='space-y-2'>
        <RosterListTable
          courseId={courseId}
          rows={filteredRows}
          search={search}
          onSearchChange={setSearch}
          onRowClick={(r) => setSelected(r)}
        />
        <p className='text-[11px] text-muted-foreground'>
          Last seen is based on course page visits.
        </p>
      </div>

      <StudentProfileDrawer
        courseId={courseId}
        student={selected}
        onClose={() => setSelected(null)}
      />
    </CourseTabPage>
  );
}
