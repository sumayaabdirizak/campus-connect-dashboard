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
import { GradebookListTable } from './gradebook-list-table';
import {
  GradebookEditDialog,
  type GradebookEditTarget
} from './gradebook-edit-dialog';
import { fmtScoreFromPct, rowNeedsGrading, toRosterStudent } from './gradebook-math';

interface CourseGradebookProps {
  courseId: string;
}

export function CourseGradebook({ courseId }: CourseGradebookProps) {
  const { data, isLoading, error, refetch } = useGradebook(courseId, true, { live: true });
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [editTarget, setEditTarget] = useState<GradebookEditTarget | null>(null);

  const needsGradingCount = useMemo(() => {
    if (!data) return 0;
    return data.students.filter((r) => rowNeedsGrading(r, data.columns)).length;
  }, [data]);

  if (!data) {
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
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Gradebook'
          description='Track assignment and quiz grades across the class.'
        />
        <QueryErrorState
          title='Could not load grades'
          message={error?.message || 'Try reloading the page.'}
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
        description={`${data.studentCount} students · ${data.markBudget.allocated}/${data.markBudget.courseMax} marks allocated · ${fmtScoreFromPct(data.classAverages.overall, data.courseMaxMarks)} class average${needsGradingCount > 0 ? ` · ${needsGradingCount} to grade` : ''}`}
      />

      <GradebookListTable
        data={data}
        onRowClick={(row) => setSelectedStudent(toRosterStudent(row))}
        onEditGrade={setEditTarget}
      />

      <GradebookEditDialog target={editTarget} onClose={() => setEditTarget(null)} />

      <StudentProfileDrawer
        courseId={courseId}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </CourseTabPage>
  );
}
