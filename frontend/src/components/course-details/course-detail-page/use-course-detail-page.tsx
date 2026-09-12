'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/lib/teacher-courses/queries';
import { useStudentCourseDetail } from '@/lib/student-courses/queries';
import { usePingCourseAccess } from '@/lib/course-details/queries/access-queries';
import type { CourseTabId } from '@/lib/course-details/queries/types';
import type { CourseTabDef } from '@/lib/course-details/config/course-tabs';
import { TEACHER_COURSE_TABS, STUDENT_COURSE_TABS } from '@/lib/course-details/config/course-tabs';

function isCourseTabId(value: string | null): value is CourseTabId {
  return (
    value === 'overview' ||
    value === 'announcements' ||
    value === 'assignments' ||
    value === 'quizzes' ||
    value === 'resources' ||
    value === 'feed' ||
    value === 'roster' ||
    value === 'groups' ||
    value === 'chat' ||
    value === 'grades'
  );
}

export function useCourseDetailPage(offeringId: string) {
  const { user, isSessionChecked } = useAuthStore();
  const searchParams = useSearchParams();
  const role = user?.role;
  const isStudent = role === 'STUDENT';
  // Dean / super-admin use the lecturer portal detail endpoint (RBAC allows read/manage).
  const isStaff = role === 'TEACHER' || role === 'DEAN' || role === 'SUPER_ADMIN';

  const visibleTabs: CourseTabDef[] = (isStudent ? STUDENT_COURSE_TABS : TEACHER_COURSE_TABS).filter(
    (t) => t.visible !== false
  );

  const tabFromUrl = searchParams?.get('tab') ?? null;
  const initialTab =
    isCourseTabId(tabFromUrl) && visibleTabs.some((t) => t.id === tabFromUrl)
      ? tabFromUrl
      : (visibleTabs[0]?.id ?? 'assignments');

  const [activeTab, setActiveTab] = useState<CourseTabId>(initialTab);

  const teacherQuery = useCourseDetail(offeringId, isSessionChecked && !!user && isStaff);
  const studentQuery = useStudentCourseDetail(offeringId, isSessionChecked && !!user && isStudent);

  const isLoading =
    !isSessionChecked ||
    !user ||
    (isStaff && teacherQuery.isLoading) ||
    (isStudent && studentQuery.isLoading);
  const error = (
    isStudent ? studentQuery.error : isStaff ? teacherQuery.error : null
  ) as Error | null;
  const data = isStudent ? studentQuery.data : isStaff ? teacherQuery.data : undefined;

  const [headerCompact, setHeaderCompact] = useState(true);
  const tabPanelRef = useRef<HTMLDivElement | null>(null);

  usePingCourseAccess(offeringId);

  const handleTabChange = (tab: CourseTabId) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  useEffect(() => {
    if (isCourseTabId(tabFromUrl) && visibleTabs.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
      return;
    }
    if (!visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'assignments');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, tabFromUrl]);

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
    tabBadges: {} as Partial<Record<CourseTabId, number>>,
    handleTabChange,
  };
}
