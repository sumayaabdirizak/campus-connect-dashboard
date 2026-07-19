'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function TabPanelFallback() {
  return (
    <div className='flex w-full flex-col gap-3'>
      <Skeleton className='h-24 w-full rounded-xl' />
      <Skeleton className='h-40 w-full rounded-xl' />
    </div>
  );
}

export const CourseFeed = dynamic(
  () =>
    import('@/features/course-details/components/course-feed').then((m) => m.CourseFeed),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseAssignments = dynamic(
  () =>
    import('@/features/course-details/components/course-assignments').then(
      (m) => m.CourseAssignments
    ),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseQuizzes = dynamic(
  () =>
    import('@/features/course-details/components/course-quizzes').then((m) => m.CourseQuizzes),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseResources = dynamic(
  () =>
    import('@/features/course-details/components/course-resources').then(
      (m) => m.CourseResources
    ),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseGroups = dynamic(
  () =>
    import('@/features/course-details/components/course-groups').then((m) => m.CourseGroups),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseRoster = dynamic(
  () =>
    import('@/features/course-details/components/course-roster').then((m) => m.CourseRoster),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseGradebook = dynamic(
  () =>
    import('@/features/course-details/components/course-gradebook').then(
      (m) => m.CourseGradebook
    ),
  { loading: TabPanelFallback, ssr: false }
);
export const CourseReviews = dynamic(
  () =>
    import('@/features/course-details/components/course-reviews').then((m) => m.CourseReviews),
  { loading: TabPanelFallback, ssr: false }
);
