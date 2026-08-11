'use client';

import { useMemo } from 'react';
import { StudentGradesCard } from '@/components/course-details/student-grades-card';
import { OverviewActivity } from './course-overview/overview-activity';
import { OverviewKpis } from './course-overview/overview-kpis';
import { OverviewSummary } from './course-overview/overview-summary';
import type { CourseOverviewProps } from './course-overview/types';

/**
 * Course Overview — Pharmacy rack-details pattern:
 * summary card → soft KPI tiles → activity table.
 */
export function CourseOverview({
  data,
  isStudent,
  onOpenTab,
  courseId,
}: CourseOverviewProps) {
  const items = data?.toReview ?? [];
  const resourcesCount = data?.quickLinks?.resourcesCount ?? 0;
  const syllabusUrl = data?.quickLinks?.syllabus?.url ?? null;
  const studentCount = data?.section?._count?.studentRegistrations ?? 0;

  const activeItems = useMemo(
    () => items.filter((item) => item.status !== 'Draft'),
    [items]
  );

  const pending = useMemo(
    () =>
      activeItems
        .filter((item) => item.pendingCount > 0)
        .reduce((sum, item) => sum + (isStudent ? 1 : item.pendingCount), 0),
    [activeItems, isStudent]
  );

  const assignments = activeItems.filter((i) => i.type === 'assignment').length;
  const quizzes = activeItems.filter((i) => i.type === 'quiz').length;

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-4'>
      <OverviewSummary
        pending={pending}
        assignments={assignments}
        quizzes={quizzes}
        resources={resourcesCount}
        credits={data?.course?.credits}
        sectionName={data?.section?.name}
        batchName={data?.batch?.name}
        studentCount={studentCount}
        isStudent={isStudent}
      />

      <OverviewKpis
        pending={pending}
        assignments={assignments}
        quizzes={quizzes}
        resources={resourcesCount}
        onOpenTab={onOpenTab}
      />

      <OverviewActivity
        items={activeItems}
        isStudent={isStudent}
        description={data?.course?.description}
        syllabusUrl={syllabusUrl}
        onOpenTab={onOpenTab}
      />

      {isStudent && courseId ? <StudentGradesCard courseId={courseId} /> : null}
    </div>
  );
}
