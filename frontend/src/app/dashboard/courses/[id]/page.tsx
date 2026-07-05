'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { ArrowLeft, Home } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/features/teacher-courses/api/queries';
import { useStudentCourseDetail } from '@/features/student-courses/api/queries';
import { CourseDetailHeader } from '@/features/teacher-courses/components/course-detail-header';
import { CourseOverview } from '@/features/teacher-courses/components/course-overview';
import { CourseFeed } from '@/features/course-details/components/course-feed';
import { CourseAssignments } from '@/features/course-details/components/course-assignments';
import { CourseQuizzes } from '@/features/course-details/components/course-quizzes';
import { CourseResources } from '@/features/course-details/components/course-resources';
import { CourseGroups } from '@/features/course-details/components/course-groups';
import { CourseRoster } from '@/features/course-details/components/course-roster';
import { CourseGradebook } from '@/features/course-details/components/course-gradebook';
import { CourseReviews, type ReviewQueueItem } from '@/features/course-details/components/course-reviews';
import { Skeleton } from '@/components/ui/skeleton';
import { usePingCourseAccess } from '@/features/course-details/api/access-queries';
import { useHotkeys } from '@/features/course-details/components/_shared/use-hotkeys';
import { Button } from '@/components/ui/button';
import {
  getVisibleCourseTabs,
  isValidCourseTab,
  type CourseTabId
} from '@/features/course-details/config/course-tabs';

export default function CourseDetailPage() {
  const params = useParams();
  const offeringId = params.id as string;
  const router = useRouter();
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

  if (isLoading) {
    return (
      <div className='flex w-full flex-col gap-4'>
        <Skeleton className='h-36 w-full rounded-xl' />
        <Skeleton className='h-11 w-full' />
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-20 rounded-xl' />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='flex w-full items-center justify-center py-20'>
        <div className='max-w-md rounded-xl border bg-card p-8 text-center shadow-sm'>
          <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
            <ArrowLeft className='size-5' />
          </div>
          <h2 className='text-xl font-semibold tracking-tight'>Course not found</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            This course doesn&apos;t exist or you don&apos;t have access.
          </p>
          <div className='mt-6 flex flex-wrap justify-center gap-2'>
            <Button variant='outline' size='sm' onClick={() => router.push('/dashboard/courses')}>
              <ArrowLeft className='size-4' />
              Back to courses
            </Button>
            <Button variant='ghost' size='sm' onClick={() => router.push('/dashboard')}>
              <Home className='size-4' />
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-0 min-h-0 flex-1 flex-col min-w-0 max-w-full'>
      <CourseDetailHeader
        course={data.course}
        section={data.section}
        batch={data.batch}
        tabs={visibleTabs}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        tabBadges={tabBadges}
        isStudent={isStudent}
        offeringId={offeringId}
        compact={headerCompact}
        onExpand={() => setHeaderCompact(false)}
      />

      <div
        ref={tabPanelRef}
        data-tab-panel
        id={`course-panel-${activeTab}`}
        role='tabpanel'
        aria-labelledby={`course-tab-${activeTab}`}
        className='mt-4 h-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto sm:mt-5'
      >
        {activeTab === 'overview' && (
          <CourseOverview
            data={data}
            isStudent={isStudent}
            onOpenTab={handleTabChange}
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
            onOpenTab={handleTabChange}
          />
        )}
      </div>
    </div>
  );
}
