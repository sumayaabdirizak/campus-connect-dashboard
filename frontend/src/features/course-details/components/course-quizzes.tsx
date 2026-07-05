'use client';

import { StudentView } from './student-quiz-view';
import { TeacherView } from './teacher-quiz-view';

interface CourseQuizzesProps {
  courseId: string;
  isStudent?: boolean;
}

export function CourseQuizzes({ courseId, isStudent }: CourseQuizzesProps) {
  return isStudent ? <StudentView courseId={courseId} /> : <TeacherView courseId={courseId} />;
}
