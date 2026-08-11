'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { CourseTabId, ReviewQueueItem } from '@/lib/course-details/queries/types';
import type { CourseTabDef } from '@/lib/course-details/config/course-tabs';
import { TEACHER_COURSE_TABS, STUDENT_COURSE_TABS } from '@/lib/course-details/config/course-tabs';

interface UseCourseDeatilPageReturn {
  isStudent: boolean;
  visibleTabs: CourseTabDef[];
  activeTab: CourseTabId;
  isLoading: boolean;
  error: string | null;
  data: {
    course: { code: string; name: string; department: { name: string }; thumbnail?: string | null };
    section: { id: string; name: string };
    batch: { id: string; name: string };
  } | null;
  headerCompact: boolean;
  setHeaderCompact: (compact: boolean) => void;
  tabPanelRef: React.RefObject<HTMLDivElement | null>;
  tabBadges: Record<CourseTabId, number>;
  handleTabChange: (tab: CourseTabId) => void;
  reviewItems: ReviewQueueItem[];
}

export function useCourseDetailPage(offeringId: string): UseCourseDeatilPageReturn {
  const [activeTab, setActiveTab] = useState<CourseTabId>('overview');
  const [headerCompact, setHeaderCompact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ course: { code: string; name: string; department: { name: string }; thumbnail?: string | null }; section: { id: string; name: string }; batch: { id: string; name: string } } | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const tabPanelRef = useRef<HTMLDivElement | null>(null);
  const [tabBadges] = useState<Record<CourseTabId, number>>({
    overview: 0,
    announcements: 0,
    feed: 0,
    assignments: 0,
    quizzes: 0,
    resources: 0,
    groups: 0,
    roster: 0,
    grades: 0,
    reviews: 0,
    chat: 0,
  });
  const [reviewItems] = useState<ReviewQueueItem[]>([]);

  useEffect(() => {
    // TODO: Load course data from API
    // setIsLoading(true);
    // Placeholder - prevents TypeScript errors
    setData({
      course: { code: '', name: '', department: { name: '' } },
      section: { id: '', name: '' },
      batch: { id: '', name: '' },
    });
    setIsLoading(false);
  }, [offeringId]);

  const handleTabChange = useCallback((tab: CourseTabId) => {
    setActiveTab(tab);
  }, []);

  const visibleTabs: CourseTabDef[] = isStudent ? STUDENT_COURSE_TABS : TEACHER_COURSE_TABS;

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
    reviewItems,
  };
}
