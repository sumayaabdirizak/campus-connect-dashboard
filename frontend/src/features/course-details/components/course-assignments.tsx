'use client';

import { StudentAssignmentsView } from './assignments/student-assignments-view';
import { SubmissionsView } from './assignments/submissions-view';
import { TeacherAssignmentsView } from './assignments/teacher-assignments-view';
import { useTeacherAssignmentList } from './assignments/use-teacher-assignment-list';

interface CourseAssignmentsProps {
  courseId: string;
  isStudent?: boolean;
}

export function CourseAssignments({ courseId, isStudent }: CourseAssignmentsProps) {
  const list = useTeacherAssignmentList(courseId);

  if (isStudent) return <StudentAssignmentsView courseId={courseId} />;

  if (list.view === 'submissions' && list.selectedAssignment) {
    return (
      <SubmissionsView
        key={list.selectedAssignment.id}
        courseId={courseId}
        assignment={list.selectedAssignment}
        onBack={() => list.setView('list')}
      />
    );
  }

  return <TeacherAssignmentsView list={list} />;
}
