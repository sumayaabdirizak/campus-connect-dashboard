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

import { CourseAttendance } from '@/features/course-details/components/course-attendance';
import { CourseRooms } from '@/features/course-details/components/course-rooms';
import { CourseResources } from '@/features/course-details/components/course-resources';
import { CourseChat } from '@/features/course-details/components/course-chat';
import { CourseGroups } from '@/features/course-details/components/course-groups';
import { CourseRoster } from '@/features/course-details/components/course-roster';
import { Skeleton } from '@/components/ui/skeleton';

export default function CourseDetailPage() {
  const params = useParams();
  const offeringId = params.id as string;
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  const isStudent = user?.role === 'STUDENT';

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
      <div className='max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10'>
        <CourseDetailHeader
          course={data.course}
          section={data.section}
          batch={data.batch}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isStudent={isStudent}
        />

        <div className='pt-2'>
          {activeTab === 'overview' && <CourseOverview data={data} isStudent={isStudent} />}

          {activeTab === 'feed' && <CourseFeed courseId={offeringId} />}

          {activeTab === 'assignments' && (
            <CourseAssignments courseId={offeringId} isStudent={isStudent} />
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
