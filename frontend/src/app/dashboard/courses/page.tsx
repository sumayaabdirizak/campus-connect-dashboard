'use client'

import Link from 'next/link'
import PageContainer from '@/features/layout/components/page-container'
import { PosPageHeader } from '@/features/pos/components/pos-page-header'
import { useAuthStore } from '@/lib/auth-store'
import { useTeacherCourses } from '@/lib/teacher-courses/queries'
import { useStudentCourses } from '@/lib/student-courses/queries'
import { CourseList } from '@/components/teacher-courses/course-list'
import { StudentCourseList } from '@/components/student-courses/course-list'
import { GraduatedBanner } from '@/components/student-courses/graduated-banner'
import { SemesterHistoryPanel } from '@/components/student-courses/semester-history-panel'
import { AdminCoursesPage } from '@/components/courses-admin/components/admin-courses-page'

export default function CoursesPage() {
  const { user } = useAuthStore()
  const isTeacher = user?.role === 'TEACHER'
  const isStudent = user?.role === 'STUDENT'
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const teacherQuery = useTeacherCourses(isTeacher)
  const studentQuery = useStudentCourses(isStudent)

  if (isSuperAdmin) return <AdminCoursesPage />

  const isLoading = isTeacher ? teacherQuery.isLoading : studentQuery.isLoading
  const error = isTeacher ? teacherQuery.error : studentQuery.error
  const data = isTeacher ? teacherQuery.data : studentQuery.data
  const isFetching = isTeacher
    ? teacherQuery.isFetching
    : studentQuery.isFetching

  if (!isTeacher && !isStudent) {
    return (
      <PageContainer>
        <PosPageHeader title='My Courses' showFullscreen={false} />
        <div className='flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 text-center'>
          <h1 className='text-lg font-semibold text-foreground'>
            For students and teachers
          </h1>
          <p className='mt-1 max-w-sm text-sm text-muted-foreground'>
            Use Course Management for the university catalogue.
          </p>
          <Link
            href='/dashboard/dean/courses'
            className='mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#2563EB]'
          >
            Open Course Management
          </Link>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PosPageHeader
        title='My Courses'
        onRefresh={() =>
          void (isTeacher ? teacherQuery.refetch() : studentQuery.refetch())
        }
        refreshing={isFetching}
        showFullscreen={false}
      />

      {error ? (
        <div className='flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 text-center'>
          <p className='text-sm font-semibold text-red-700'>
            Couldnâ€™t load courses
          </p>
          <p className='mt-1 text-xs text-red-600/80'>Please try again later</p>
        </div>
      ) : isTeacher ? (
        <CourseList
          courses={Array.isArray(data) ? data : []}
          isLoading={isLoading}
        />
      ) : (
        <>
          {!Array.isArray(data) && data?.isGraduated ? (
            <GraduatedBanner graduatedAt={data.graduatedAt} />
          ) : null}
          <StudentCourseList
            courses={!Array.isArray(data) ? (data?.offerings ?? []) : []}
            isLoading={isLoading}
          />
          {isStudent ? <SemesterHistoryPanel /> : null}
        </>
      )}
    </PageContainer>
  )
}

