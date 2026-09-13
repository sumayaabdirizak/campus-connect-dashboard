'use client';

import { CourseDetailHeader } from '@/components/teacher-courses/course-detail-header';
import { Skeleton } from '@/features/ui/components/skeleton';
import { CourseTabsPrefetch } from '@/components/course-details/course-tabs-prefetch';
import { CourseLiveClockProvider } from '@/components/course-details/course-live-clock';
import { CourseNotFoundState } from '@/components/course-details/course-detail-page/course-not-found-state';
import { CourseTabPanelContent } from '@/components/course-details/course-detail-page/course-tab-panel-content';
import { useCourseDetailPage } from '@/components/course-details/course-detail-page/use-course-detail-page';

export function CourseDetailPageClient({ offeringId }: { offeringId: string }) {
  const {
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
    handleTabChange
  } = useCourseDetailPage(offeringId);

  if (!offeringId) {
    return <CourseNotFoundState errorMessage='Missing course id' />;
  }

  if (isLoading) {
    return (
      <div className='flex w-full flex-col gap-4'>
        <Skeleton className='h-44 w-full rounded-xl border border-border' />
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          <Skeleton className='h-40 rounded-xl border border-border' />
          <Skeleton className='h-40 rounded-xl border border-border lg:col-span-2' />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <CourseNotFoundState errorMessage={error} />;
  }

  return (
    <CourseLiveClockProvider>
      <div className='flex h-0 min-h-0 flex-1 flex-col min-w-0 max-w-full'>
        <CourseTabsPrefetch courseId={offeringId} isStudent={isStudent} />
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
          onCompactChange={setHeaderCompact}
        />

        <div
          ref={tabPanelRef}
          data-tab-panel
          id={`course-panel-${activeTab}`}
          role='tabpanel'
          aria-labelledby={`course-tab-${activeTab}`}
          className='mt-5 h-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto [overflow-anchor:none] sm:mt-6'
        >
          <CourseTabPanelContent
            activeTab={activeTab}
            offeringId={offeringId}
            isStudent={isStudent}
            data={data as any}
            onTabChange={handleTabChange}
          />
        </div>
      </div>
    </CourseLiveClockProvider>
  );
}
