'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { CourseTabId, ReviewQueueItem } from '@/lib/course-details/queries/types';

interface UseCourseDeatilPageReturn {
  isStudent: boolean;
  visibleTabs: CourseTabId[];
  activeTab: CourseTabId;
  isLoading: boolean;
  error: string | null;
  data: {
    course: { id: string; code: string; title: string };
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
  const [data, setData] = useState<{ course: { id: string; code: string; title: string }; section: { id: string; name: string }; batch: { id: string; name: string } } | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const tabPanelRef = useRef<HTMLDivElement | null>(null);
  const [tabBadges] = useState<Record<CourseTabId, number>>({
    overview: 0,
    feed: 0,
    assignments: 0,
    quizzes: 0,
    resources: 0,
    groups: 0,
    roster: 0,
    grades: 0,
    reviews: 0,
  });
  const [reviewItems] = useState<ReviewQueueItem[]>([]);

  useEffect(() => {
    // TODO: Load course data from API
    // setIsLoading(true);
    // Placeholder - prevents TypeScript errors
    setData({
      course: { id: offeringId, code: '', title: '' },
      section: { id: '', name: '' },
      batch: { id: '', name: '' },
    });
    setIsLoading(false);
  }, [offeringId]);

  const handleTabChange = useCallback((tab: CourseTabId) => {
    setActiveTab(tab);
  }, []);

  const visibleTabs: CourseTabId[] = isStudent
    ? ['overview', 'feed', 'assignments', 'quizzes', 'resources', 'groups']
    : ['overview', 'feed', 'assignments', 'quizzes', 'resources', 'groups', 'roster', 'grades', 'reviews'];

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
