'use client';

import React from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useTeacherCourses } from '@/features/teacher-courses/api/queries';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { CourseList } from '@/features/teacher-courses/components/course-list';
import { StudentCourseList } from '@/features/student-courses/components/course-list';
import PageContainer from '@/components/layout/page-container';

export default function CoursesPage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const teacherQuery = useTeacherCourses(isTeacher);
  const studentQuery = useStudentCourses(isStudent);

  const isLoading = isTeacher ? teacherQuery.isLoading : studentQuery.isLoading;
  const error = isTeacher ? teacherQuery.error : studentQuery.error;
  const data = isTeacher ? teacherQuery.data : studentQuery.data;

  if (error) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='space-y-2 text-center'>
          <p className='font-semibold text-destructive'>Error loading courses</p>
          <p className='text-sm text-muted-foreground'>Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      pageTitle='My Courses'
      pageDescription={
        isTeacher
          ? `${Array.isArray(data) ? data.length : 0} courses you're teaching`
          : `${!Array.isArray(data) ? (data?.offerings?.length ?? 0) : 0} enrolled courses`
      }
    >
      {isTeacher ? (
        <CourseList courses={Array.isArray(data) ? data : []} isLoading={isLoading} />
      ) : (
        <StudentCourseList
          courses={!Array.isArray(data) ? (data?.offerings ?? []) : []}
          isLoading={isLoading}
        />
      )}
    </PageContainer>
  );
}
