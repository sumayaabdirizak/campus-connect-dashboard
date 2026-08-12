'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/lib/teacher-courses/queries';
import { useStudentCourseDetail } from '@/lib/student-courses/queries';
import { usePingCourseAccess } from '@/lib/course-details/queries/access-queries';
import type { CourseTabId, ReviewQueueItem } from '@/lib/course-details/queries/types';
import type { CourseTabDef } from '@/lib/course-details/config/course-tabs';
import { TEACHER_COURSE_TABS, STUDENT_COURSE_TABS } from '@/lib/course-details/config/course-tabs';

export function useCourseDetailPage(offeringId: string) {
  const { user, isSessionChecked } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER';

  const visibleTabs: CourseTabDef[] = isStudent ? STUDENT_COURSE_TABS : TEACHER_COURSE_TABS;

  const [activeTab, setActiveTab] = useState<CourseTabId>(visibleTabs[0]?.id ?? 'announcements');

  const teacherQuery = useCourseDetail(offeringId, isSessionChecked && isTeacher);
  const studentQuery = useStudentCourseDetail(offeringId, isSessionChecked && isStudent);

  const isLoading =
    !isSessionChecked ||
    (isTeacher && teacherQuery.isLoading) ||
    (isStudent && studentQuery.isLoading);
  const error = (isStudent ? studentQuery.error : teacherQuery.error) as Error | null;
  const data = isStudent ? studentQuery.data : teacherQuery.data;

  const [headerCompact, setHeaderCompact] = useState(false);
  const tabPanelRef = useRef<HTMLDivElement | null>(null);

  usePingCourseAccess(offeringId);

  const reviewItems: ReviewQueueItem[] = (data?.toReview ?? []) as ReviewQueueItem[];
  const reviewsBadge = useMemo(
    () =>
      reviewItems
        .filter((t) => t.status !== 'Draft')
        .reduce((sum, i) => sum + i.pendingCount, 0),
    [reviewItems]
  );

  const tabBadges: Partial<Record<CourseTabId, number>> = useMemo(
    () => (reviewsBadge > 0 ? { reviews: reviewsBadge } : {}),
    [reviewsBadge]
  );

  const handleTabChange = (tab: CourseTabId) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'announcements');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent]);

  return {
    isStudent,
    visibleTabs,
    activeTab,
    isLoading,
    error: error ? error.message : null,
    data,
    headerCompact,
    setHeaderCompact,
    tabPanelRef,
    tabBadges,
    handleTabChange,
    reviewItems,
  };
}
