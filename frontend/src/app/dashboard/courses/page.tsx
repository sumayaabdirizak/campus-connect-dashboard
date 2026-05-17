'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, GraduationCap } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useTeacherCourses } from '@/features/teacher-courses/api/queries';
import { useStudentCourses } from '@/features/student-courses/api/queries';
import { CourseList } from '@/features/teacher-courses/components/course-list';
import { StudentCourseList } from '@/features/student-courses/components/course-list';

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
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center space-y-2'>
          <p className='text-destructive font-semibold'>Error loading courses</p>
          <p className='text-sm text-muted-foreground'>Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-1 p-4 md:p-6'>
      <div className='flex flex-col flex-1 max-w-5xl mx-auto w-full'>
        {/* Header */}
        <div className='flex items-center justify-between mb-5'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-primary/10 rounded-xl'>
              <GraduationCap className='w-5 h-5 text-primary' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-foreground'>My Courses</h1>
              <p className='text-sm text-muted-foreground'>
                {isTeacher
                  ? `${(data as any[])?.length || 0} courses you're teaching`
                  : `${(data as any)?.offerings?.length || 0} enrolled courses`}
              </p>
            </div>
          </div>
          {isTeacher && (
            <Button className='bg-primary font-semibold'>
              <Plus className='w-4 h-4 mr-2' />
              New Course
            </Button>
          )}
        </div>

        {/* Course List */}
        {isTeacher ? (
          <CourseList courses={(data as any[]) || []} isLoading={isLoading} />
        ) : (
          <StudentCourseList
            courses={((data as any)?.offerings as any[]) || []}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
