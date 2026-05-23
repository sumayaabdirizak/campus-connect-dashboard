'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useCourseDetail } from '@/features/teacher-courses/api/queries';
import { useStudentCourseDetail } from '@/features/student-courses/api/queries';
import { CourseDetailHeader } from '@/features/teacher-courses/components/course-detail-header';
import { CourseOverview } from '@/features/teacher-courses/components/course-overview';
import { CourseFeed } from '@/features/course-details/components/course-feed';
import { CourseAssignments } from '@/features/course-details/components/course-assignments';
import { CourseQuizzes } from '@/features/course-details/components/course-quizzes';

import { CourseAttendance } from '@/features/course-details/components/course-attendance';
import { CourseRooms } from '@/features/course-details/components/course-rooms';
import { CourseResources } from '@/features/course-details/components/course-resources';
import { CourseChat } from '@/features/course-details/components/course-chat';
import { CourseGroups } from '@/features/course-details/components/course-groups';
import { CourseRoster } from '@/features/course-details/components/course-roster';
import { Skeleton } from '@/components/ui/skeleton';
import { usePingCourseAccess } from '@/features/course-details/api/access-queries';
import { useHotkeys } from '@/features/course-details/components/_shared/use-hotkeys';

export default function CourseDetailPage() {
  const params = useParams();
  const offeringId = params.id as string;
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  const isStudent = user?.role === 'STUDENT';

  usePingCourseAccess(offeringId);

  // Page-level keyboard shortcuts. Tab navigation lives here so `1`–`9`
  // jumps tabs regardless of which tab is currently active.
  const tabOrder = [
    'overview',
    'feed',
    'chat',
    'assignments',
    'quizzes',
    'attendance',
    'resources',
    'groups',
    ...(!isStudent ? ['roster'] : [])
  ];
  useHotkeys({
    '/': () => {
      // Focus the first visible search input on the active tab. Falls back
      // to the first input if nothing matches.
      const root = document.querySelector('[data-tab-panel]') ?? document;
      const target =
        root.querySelector<HTMLInputElement>(
          'input[placeholder*="earch" i], input[placeholder*="ind" i]'
        ) ?? root.querySelector<HTMLInputElement>('input');
      target?.focus();
      target?.select?.();
    },
    Escape: () => {
      // Let Radix dialogs/sheets handle their own Escape; this just clears
      // tab-local focus so visible-focus rings don't linger after dismissal.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    },
    'mod+k': () => {
      // Reserved for a future command palette. For now, mirrors `/`.
      const target = document.querySelector<HTMLInputElement>('input[placeholder*="earch" i]');
      target?.focus();
    },
    'mod+]': () => setActiveTab(tabOrder[(tabOrder.indexOf(activeTab) + 1) % tabOrder.length]),
    'mod+[': () =>
      setActiveTab(
        tabOrder[(tabOrder.indexOf(activeTab) - 1 + tabOrder.length) % tabOrder.length]
      ),
    '1': () => setActiveTab(tabOrder[0]),
    '2': () => setActiveTab(tabOrder[1]),
    '3': () => setActiveTab(tabOrder[2]),
    '4': () => setActiveTab(tabOrder[3]),
    '5': () => setActiveTab(tabOrder[4]),
    '6': () => setActiveTab(tabOrder[5]),
    '7': () => setActiveTab(tabOrder[6]),
    '8': () => setActiveTab(tabOrder[7]),
    '9': () => tabOrder[8] && setActiveTab(tabOrder[8])
  });

  const teacherQuery = useCourseDetail(offeringId, !isStudent);
  const studentQuery = useStudentCourseDetail(offeringId, isStudent);

  const isLoading = teacherQuery.isLoading || studentQuery.isLoading;
  const error = isStudent ? studentQuery.error : teacherQuery.error;
  const data = isStudent ? studentQuery.data : teacherQuery.data;

  if (isLoading) {
    return (
      <div className='space-y-8 w-full p-4'>
        <Skeleton className='h-40 w-full rounded-3xl' />
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 w-full'>
          <Skeleton className='lg:col-span-2 h-96 rounded-3xl' />
          <Skeleton className='h-96 rounded-3xl' />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='text-center py-20 w-full'>
        <h2 className='text-2xl font-bold text-destructive'>Course not found</h2>
        <p className='text-muted-foreground'>
          The course you are looking for does not exist or you don't have access.
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#fcfcfc] dark:bg-slate-950/50 w-full transition-all duration-300'>
      <div className='max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 sm:space-y-10'>
        <CourseDetailHeader
          course={data.course}
          section={data.section}
          batch={data.batch}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStudent={isStudent}
        />

        <div className='pt-2' data-tab-panel>
          {activeTab === 'overview' && <CourseOverview data={data} isStudent={isStudent} />}

          {activeTab === 'feed' && <CourseFeed courseId={offeringId} />}

          {activeTab === 'assignments' && (
            <CourseAssignments courseId={offeringId} isStudent={isStudent} />
          )}

          {activeTab === 'quizzes' && (
            <CourseQuizzes courseId={offeringId} isStudent={isStudent} />
          )}

          {activeTab === 'attendance' && (
            <CourseAttendance courseId={offeringId} isStudent={isStudent} />
          )}

          {activeTab === 'resources' && (
            <CourseResources courseId={offeringId} isStudent={isStudent} />
          )}

          {activeTab === 'chat' && <CourseChat courseId={offeringId} isStudent={isStudent} />}

          {activeTab === 'groups' && <CourseGroups courseId={offeringId} isStudent={isStudent} />}

          {activeTab === 'roster' && !isStudent && <CourseRoster courseId={offeringId} />}
        </div>
      </div>
    </div>
  );
}
