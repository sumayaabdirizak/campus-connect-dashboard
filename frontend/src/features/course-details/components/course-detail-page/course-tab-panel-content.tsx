'use client';

import { CourseOverview } from '@/features/teacher-courses/components/course-overview';
import type { ReviewQueueItem } from '@/features/course-details/components/course-reviews';
import type { CourseTabId } from '@/features/course-details/config/course-tabs';
import type { OverviewData } from '@/features/teacher-courses/components/course-overview/types';
import {
  CourseAssignments,
  CourseFeed,
  CourseGradebook,
  CourseGroups,
  CourseQuizzes,
  CourseResources,
  CourseReviews,
  CourseRoster
} from './dynamic-tab-imports';

interface CourseTabPanelContentProps {
  activeTab: CourseTabId;
  offeringId: string;
  isStudent: boolean;
  data: OverviewData & { course: { code: string }; section: unknown; batch: unknown };
  reviewItems: ReviewQueueItem[];
  onTabChange: (tab: CourseTabId) => void;
}

export function CourseTabPanelContent({
  activeTab,
  offeringId,
  isStudent,
  data,
  reviewItems,
  onTabChange
}: CourseTabPanelContentProps) {
  return (
    <>
      {activeTab === 'overview' && (
        <CourseOverview
          data={data}
          isStudent={isStudent}
          onOpenTab={onTabChange}
          courseCode={data.course.code}
          courseId={offeringId}
        />
      )}

      {activeTab === 'feed' && <CourseFeed courseId={offeringId} isStudent={isStudent} />}

      {activeTab === 'assignments' && (
        <CourseAssignments courseId={offeringId} isStudent={isStudent} />
      )}

      {activeTab === 'quizzes' && (
        <CourseQuizzes courseId={offeringId} isStudent={isStudent} />
      )}

      {activeTab === 'resources' && (
        <CourseResources courseId={offeringId} isStudent={isStudent} />
      )}

      {activeTab === 'groups' && (
        <CourseGroups courseId={offeringId} isStudent={isStudent} />
      )}

      {activeTab === 'roster' && !isStudent && <CourseRoster courseId={offeringId} />}

      {activeTab === 'grades' && !isStudent && <CourseGradebook courseId={offeringId} />}

      {activeTab === 'reviews' && !isStudent && (
        <CourseReviews
          items={reviewItems}
          isStudent={isStudent}
          onOpenTab={onTabChange}
        />
      )}
    </>
  );
}
