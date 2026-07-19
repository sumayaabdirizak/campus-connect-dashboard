'use client';

import { useParams } from 'next/navigation';
import { CourseDetailHeader } from '@/features/teacher-courses/components/course-detail-header';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseTabsPrefetch } from '@/features/course-details/components/course-tabs-prefetch';
import { CourseNotFoundState } from '@/features/course-details/components/course-detail-page/course-not-found-state';
import { CourseTabPanelContent } from '@/features/course-details/components/course-detail-page/course-tab-panel-content';
import { useCourseDetailPage } from '@/features/course-details/components/course-detail-page/use-course-detail-page';

export default function CourseDetailPage() {
  const params = useParams();
  const offeringId = params.id as string;

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
    handleTabChange,
    reviewItems
  } = useCourseDetailPage(offeringId);

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
    return <CourseNotFoundState />;
  }

  return (
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
        <CourseTabPanelContent
          activeTab={activeTab}
          offeringId={offeringId}
          isStudent={isStudent}
          data={data}
          reviewItems={reviewItems}
          onTabChange={handleTabChange}
        />
      </div>
    </div>
  );
}
