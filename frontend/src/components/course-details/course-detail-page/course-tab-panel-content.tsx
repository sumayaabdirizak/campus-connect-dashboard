'use client';

import { CourseOverview } from '@/components/teacher-courses/course-overview';
import type { ReviewQueueItem } from '@/lib/course-details/queries/question-bank-queries';
import type { CourseTabId } from '@/lib/course-details/queries/types';
import type { OverviewData } from '@/components/teacher-courses/course-overview/types';
import {
  CourseAssignments,
  CourseChat,
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
          courseId={offeringId}
        />
      )}

      {activeTab === 'feed' && <CourseFeed courseId={offeringId} isStudent={isStudent} />}

      {activeTab === 'chat' && <CourseChat courseId={offeringId} isStudent={isStudent} />}

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
