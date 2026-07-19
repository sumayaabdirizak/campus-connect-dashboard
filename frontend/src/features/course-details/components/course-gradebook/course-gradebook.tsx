'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Users } from 'lucide-react';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { QueryErrorState } from '@/components/query-error-state';
import { StudentProfileDrawer } from '../student-profile-drawer';
import { useGradebook } from '../../api/gradebook-queries';
import type { RosterStudent } from '../../api/roster-types';
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
  const { data, isLoading, isError, refetch } = useGradebook(courseId);
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

  if (isLoading) return <ListSkeleton variant='row' count={8} />;

  if (isError || !data) {
    return (
      <QueryErrorState
        title='Could not load grades'
        message='Try reloading the page.'
        onRetry={() => void refetch()}
      />
    );
  }

  const itemCount = data.columns.assignments.length + data.columns.quizzes.length;

  if (data.studentCount === 0) {
    return (
      <EmptyState
        icon={Users}
        title='No students enrolled'
        description='Grades will appear here once students join the course.'
      />
    );
  }

  if (itemCount === 0) {
    return (
      <EmptyState
        icon={AlertCircle}
        title='Nothing to grade yet'
        description='Publish an assignment or quiz to start tracking grades.'
      />
    );
  }

  return (
    <div className='space-y-3'>
      <p className='text-sm text-muted-foreground'>
        {data.studentCount} students · {data.columns.assignments.length} assignments ·{' '}
        {data.columns.quizzes.length} quizzes · {fmtPct(data.classAverages.overall)} class
        average
        {needsGradingCount > 0 ? ` · ${needsGradingCount} to grade` : ''}
      </p>

      <div className='border border-border/60'>
        <GradebookToolbar
          data={data}
          search={search}
          setSearch={setSearch}
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
    </div>
  );
}
