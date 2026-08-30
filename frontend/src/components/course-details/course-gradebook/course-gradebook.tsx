'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { CourseTabHeader } from '../_shared/course-tab-header';
import { CourseTabPage } from '../_shared/course-tab-page';
import { QueryErrorState } from '@/components/query-error-state';
import { StudentProfileDrawer } from '../student-profile-drawer';
import { useGradebook } from '@/lib/course-details/queries/gradebook-queries';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';
import { GradebookTable } from './gradebook-table';
import { GradebookToolbar } from './gradebook-toolbar';
import {
  type GradeFilter,
  fmtPct,
  rowNeedsGrading,
  toRosterStudent
} from './gradebook-math';

interface CourseGradebookProps {
  courseId: string;
}

export function CourseGradebook({ courseId }: CourseGradebookProps) {
  const { data, isLoading, isError, refetch } = useGradebook(courseId, true, { live: true });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GradeFilter>('all');
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);

  const needsGradingCount = useMemo(() => {
    if (!data) return 0;
    return data.students.filter((r) => rowNeedsGrading(r, data.columns)).length;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.students;
    if (filter === 'needs_grading') {
      rows = rows.filter((r) => rowNeedsGrading(r, data.columns));
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.number ?? '').toLowerCase().includes(q)
    );
  }, [data, search, filter]);

  if (isLoading) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Gradebook'
          description='Track assignment and quiz grades across the class.'
        />
        <ListSkeleton variant='row' count={8} />
      </CourseTabPage>
    );
  }

  if (isError || !data) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Gradebook'
          description='Track assignment and quiz grades across the class.'
        />
        <QueryErrorState
          title='Could not load grades'
          message='Try reloading the page.'
          onRetry={() => void refetch()}
        />
      </CourseTabPage>
    );
  }

  const itemCount = data.columns.assignments.length + data.columns.quizzes.length;

  if (data.studentCount === 0) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Gradebook'
          description='Track assignment and quiz grades across the class.'
        />
        <EmptyState
          icon={Users}
          title='No students enrolled'
          description='Grades will appear here once students join the course.'
        />
      </CourseTabPage>
    );
  }

  if (itemCount === 0) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Gradebook'
          description='Track assignment and quiz grades across the class.'
        />
        <EmptyState
          icon={AlertCircle}
          title='Nothing to grade yet'
          description='Publish an assignment or quiz to start tracking grades.'
        />
      </CourseTabPage>
    );
  }

  return (
    <CourseTabPage>
      <CourseTabHeader
        title='Gradebook'
        description={`${data.studentCount} students · ${data.columns.assignments.length} assignments · ${data.columns.quizzes.length} quizzes · ${fmtPct(data.classAverages.overall)} class average${needsGradingCount > 0 ? ` · ${needsGradingCount} to grade` : ''}`}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search students…',
          'aria-label': 'Search students'
        }}
      />

      <div className='overflow-hidden rounded-xl border border-border bg-card'>
        <GradebookToolbar
          data={data}
          filter={filter}
          setFilter={setFilter}
          needsGradingCount={needsGradingCount}
        />
        <GradebookTable
          data={data}
          filtered={filtered}
          search={search}
          onRowClick={(row) => setSelectedStudent(toRosterStudent(row))}
        />
      </div>

      <StudentProfileDrawer
        courseId={courseId}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </CourseTabPage>
  );
}
