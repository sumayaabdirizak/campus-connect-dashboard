'use client'

import { useAuthStore } from '@/lib/auth-store'
import { useTeacherCourses } from '@/lib/teacher-courses/queries'
import { CourseCard } from '@/components/teacher-courses/course-card'
import { DashboardHeader } from '../dashboards/components/dashboard-header'
import { SummaryCard } from '../dashboards/components/summary-card'
import { Card, CardContent } from '@/features/ui/components/card'
import { Button } from '@/features/ui/components/button'
import { Badge } from '@/features/ui/components/badge'
import { Skeleton } from '@/features/ui/components/skeleton'
import { FileText, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import type { Course } from '@/lib/teacher-courses/types'

export function TeacherDashboard() {
  const user = useAuthStore((state) => state.user)
  const coursesQuery = useTeacherCourses(true)

  const courses = coursesQuery.data?.courses || []
  const isLoading = coursesQuery.isLoading
  const hasError = coursesQuery.error

  // Calculate KPIs
  const totalStudents = courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0)
  const totalPending = courses.reduce((sum, c) => sum + (c.pendingSubmissions || 0), 0)
  const totalDrafts = courses.reduce((sum, c) => sum + (c.drafts || 0), 0)

  if (hasError) {
    return (
      <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center'>
        <AlertCircle className='mx-auto mb-4 h-12 w-12 text-destructive' />
        <p className='font-medium text-destructive'>Failed to load dashboard</p>
        <p className='mt-1 text-sm text-muted-foreground'>Please try refreshing</p>
      </div>
    )
  }

  return (
    <div className='space-y-8 pb-8'>
      {/* Header */}
      <DashboardHeader
        user={user}
        title={`Welcome, ${user?.name || 'Instructor'}!`}
        subtitle='Here is your teaching dashboard'
      />

      {/* Summary Cards */}
      {isLoading ? (
        <div className='grid grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className='h-24' />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-4 gap-4'>
          <SummaryCard
            icon={<FileText className='h-6 w-6' />}
            title='Courses Teaching'
            value={courses.length}
            color='blue'
          />
          <SummaryCard
            icon={<Users className='h-6 w-6' />}
            title='Total Students'
            value={totalStudents}
            color='green'
          />
          <SummaryCard
            icon={<Clock className='h-6 w-6' />}
            title='Pending Submissions'
            value={totalPending}
            color='orange'
          />
          <SummaryCard
            icon={<CheckCircle className='h-6 w-6' />}
            title='Drafts'
            value={totalDrafts}
            color='purple'
          />
        </div>
      )}

      {/* My Classes Section */}
      <div>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-2xl font-bold'>My Classes</h2>
          <Button variant='ghost' size='sm'>
            View All
          </Button>
        </div>

        {isLoading ? (
          <div className='grid grid-cols-3 gap-4'>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className='h-48' />
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className='grid grid-cols-3 gap-4'>
            {courses.map((course: Course) => (
              <div key={course.id} className='relative'>
                <CourseCard
                  course={{
                    id: course.id,
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    department: course.department,
                    section: course.section,
                    thumbnail: course.thumbnail,
                    totalStudents: course.totalStudents,
                    totalLessons: course.totalLessons,
                    schedule: course.schedule,
                    status: course.status
                  }}
                />
                <div className='absolute top-2 right-2 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
                  {course.totalStudents} students
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className='bg-muted/50'>
            <CardContent className='flex h-48 items-center justify-center text-center'>
              <div>
                <FileText className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
                <p className='text-muted-foreground'>No classes assigned</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending Submissions Summary */}
      {!isLoading && totalPending > 0 && (
        <div>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-2xl font-bold'>Submissions to Grade ({totalPending})</h2>
            <Button variant='ghost' size='sm'>
              Grade All
            </Button>
          </div>

          <div className='space-y-2'>
            {courses
              .filter((c) => (c.pendingSubmissions || 0) > 0)
              .map((course) => (
                <Card key={course.id} className='transition-colors hover:bg-accent'>
                  <CardContent className='flex items-center justify-between p-4'>
                    <div className='flex-1'>
                      <p className='font-medium'>{course.courseName}</p>
                      <p className='text-sm text-muted-foreground'>{course.section}</p>
                    </div>
                    <div className='text-right'>
                      <Badge variant='outline'>{course.pendingSubmissions} pending</Badge>
                      <p className='mt-1 text-sm text-muted-foreground'>Ready to grade</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherDashboard
