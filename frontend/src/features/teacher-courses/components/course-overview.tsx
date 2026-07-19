'use client';

import { useMemo } from 'react';
import { courseColor } from '@/features/student-courses/lib/course-color';
import { CourseScheduleSection } from './course-overview/course-schedule-section';
import { CourseReviewQueueSection } from './course-overview/course-review-queue-section';
import type { CourseOverviewProps } from './course-overview/types';

export function CourseOverview({
  data,
  isStudent,
  onOpenTab,
  courseCode,
  courseId
}: CourseOverviewProps) {
  const schedules = data?.schedules ?? [];
  const toReview = data?.toReview ?? [];
  const syllabus = data?.quickLinks?.syllabus ?? null;
  const resourcesCount = data?.quickLinks?.resourcesCount ?? 0;

  const pendingTotal = useMemo(
    () =>
      toReview
        .filter((t) => t.status !== 'Draft')
        .reduce((sum, i) => sum + i.pendingCount, 0),
    [toReview]
  );

  const accentColor = courseCode ? courseColor(courseCode) : 'hsl(var(--primary))';

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-4 sm:gap-5'>
      <div className='grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3'>
        <CourseScheduleSection schedules={schedules} accentColor={accentColor} />
        <CourseReviewQueueSection
          isStudent={isStudent}
          pendingTotal={pendingTotal}
          resourcesCount={resourcesCount}
          syllabusUrl={syllabus?.url}
          courseId={courseId}
          onOpenTab={onOpenTab}
        />
      </div>
    </div>
  );
}
