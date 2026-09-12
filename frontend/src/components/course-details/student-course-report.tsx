'use client';

import { GraduationCap } from 'lucide-react';
import { CourseTabPage } from '@/components/course-details/_shared/course-tab-page';
import { CourseTabHeader } from '@/components/course-details/_shared/course-tab-header';
import { StudentGradesCard } from '@/components/course-details/student-grades-card';

type Props = {
  courseId: string;
};

/** Student self-service report for a course they are taking. */
export function StudentCourseReport({ courseId }: Props) {
  return (
    <CourseTabPage>
      <CourseTabHeader
        title='My report'
        description='Your grades and progress for this course.'
      />
      <StudentGradesCard courseId={courseId} showEmpty />
    </CourseTabPage>
  );
}
