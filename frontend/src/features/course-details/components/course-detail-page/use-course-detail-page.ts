'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/features/teacher-courses/api/queries';
import { useStudentCourseDetail } from '@/features/student-courses/api/queries';
import type { ReviewQueueItem } from '@/features/course-details/components/course-reviews';
import { usePingCourseAccess } from '@/features/course-details/api/access-queries';
import { useHotkeys } from '@/features/course-details/components/_shared/use-hotkeys';
import {
  getVisibleCourseTabs,
  isValidCourseTab,
  type CourseTabId
} from '@/features/course-details/config/course-tabs';

export function useCourseDetailPage(offeringId: string) {
  const { user, isSessionChecked } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const isTeacher = user?.role === 'TEACHER';

  const visibleTabs = useMemo(() => getVisibleCourseTabs(isStudent), [isStudent]);
  const tabIds = useMemo(() => visibleTabs.map((t) => t.id), [visibleTabs]);

  const tabParser = useMemo(
    () => parseAsStringLiteral(tabIds as [CourseTabId, ...CourseTabId[]]).withDefault('overview'),
    [tabIds]
  );

  const [activeTab, setActiveTab] = useQueryState('tab', tabParser);

  const teacherQuery = useCourseDetail(offeringId, isSessionChecked && isTeacher);
  const studentQuery = useStudentCourseDetail(offeringId, isSessionChecked && isStudent);

  const isLoading =
    !isSessionChecked ||
    (isTeacher && teacherQuery.isLoading) ||
    (isStudent && studentQuery.isLoading);
  const error = isStudent ? studentQuery.error : teacherQuery.error;
  const data = isStudent ? studentQuery.data : teacherQuery.data;

  const [headerCompact, setHeaderCompact] = useState(false);
  const tabPanelRef = useRef<HTMLDivElement>(null);
  const skipCompactResetRef = useRef(false);

  useEffect(() => {
    const panel = tabPanelRef.current;
    if (!panel) return;

    skipCompactResetRef.current = true;
    panel.scrollTo({ top: 0 });

    const timer = window.setTimeout(() => {
      skipCompactResetRef.current = false;
    }, 150);

    return () => window.clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    if (isLoading) return;

    const panel = tabPanelRef.current;
    if (!panel) return;

    const onScroll = () => {
      if (skipCompactResetRef.current) return;
      setHeaderCompact(panel.scrollTop > 48);
    };

    panel.addEventListener('scroll', onScroll, { passive: true });
    return () => panel.removeEventListener('scroll', onScroll);
  }, [activeTab, isLoading]);

  usePingCourseAccess(offeringId);

  useHotkeys({
    '/': () => {
      const root = document.querySelector('[data-tab-panel]') ?? document;
      const target =
        root.querySelector<HTMLInputElement>(
          'input[placeholder*="earch" i], input[placeholder*="ind" i]'
        ) ?? root.querySelector<HTMLInputElement>('input');
      target?.focus();
      target?.select?.();
    },
    Escape: () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    },
    'mod+k': () => {
      const target = document.querySelector<HTMLInputElement>('input[placeholder*="earch" i]');
      target?.focus();
    },
    'mod+]': () => {
      const idx = tabIds.indexOf(activeTab);
      setActiveTab(tabIds[(idx + 1) % tabIds.length]);
    },
    'mod+[': () => {
      const idx = tabIds.indexOf(activeTab);
      setActiveTab(tabIds[(idx - 1 + tabIds.length) % tabIds.length]);
    },
    '1': () => tabIds[0] && setActiveTab(tabIds[0]),
    '2': () => tabIds[1] && setActiveTab(tabIds[1]),
    '3': () => tabIds[2] && setActiveTab(tabIds[2]),
    '4': () => tabIds[3] && setActiveTab(tabIds[3]),
    '5': () => tabIds[4] && setActiveTab(tabIds[4]),
    '6': () => tabIds[5] && setActiveTab(tabIds[5]),
    '7': () => tabIds[6] && setActiveTab(tabIds[6]),
    '8': () => tabIds[7] && setActiveTab(tabIds[7]),
    '9': () => tabIds[8] && setActiveTab(tabIds[8])
  });

  const reviewItems: ReviewQueueItem[] = (data?.toReview ?? []) as ReviewQueueItem[];
  const reviewsBadge = useMemo(
    () =>
      reviewItems
        .filter((t: ReviewQueueItem) => t.status !== 'Draft')
        .reduce((sum: number, i: ReviewQueueItem) => sum + i.pendingCount, 0),
    [reviewItems]
  );

  const tabBadges = useMemo(
    () => (reviewsBadge > 0 ? { reviews: reviewsBadge } : undefined),
    [reviewsBadge]
  );

  const handleTabChange = (tab: CourseTabId) => {
    if (isValidCourseTab(tab, isStudent)) {
      void setActiveTab(tab);
    }
  };

  return {
    isStudent,
    visibleTabs,
    activeTab,
    isLoading,
    error,
    data,
    headerCompact,
    setHeaderCompact,
    tabPanelRef,
    tabBadges,
    handleTabChange,
    reviewItems
  };
}
