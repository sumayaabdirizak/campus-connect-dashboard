'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/lib/teacher-courses/queries';
import { useStudentCourseDetail } from '@/lib/student-courses/queries';
import { usePingCourseAccess } from '@/lib/course-details/queries/access-queries';
import type { CourseTabId } from '@/lib/course-details/queries/types';
import type { CourseTabDef } from '@/lib/course-details/config/course-tabs';
import { TEACHER_COURSE_TABS, STUDENT_COURSE_TABS } from '@/lib/course-details/config/course-tabs';

export function useCourseDetailPage(offeringId: string) {
  const { user, isSessionChecked } = useAuthStore();
  const role = user?.role;
  const isStudent = role === 'STUDENT';
  // Dean / super-admin use the lecturer portal detail endpoint (RBAC allows read/manage).
  const isStaff = role === 'TEACHER' || role === 'DEAN' || role === 'SUPER_ADMIN';

  const visibleTabs: CourseTabDef[] = (isStudent ? STUDENT_COURSE_TABS : TEACHER_COURSE_TABS).filter(
    (t) => t.visible !== false
  );

  const [activeTab, setActiveTab] = useState<CourseTabId>(visibleTabs[0]?.id ?? 'announcements');

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
    tabBadges: {} as Partial<Record<CourseTabId, number>>,
    handleTabChange,
  };
}
