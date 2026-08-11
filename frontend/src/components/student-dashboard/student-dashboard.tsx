'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { useStudentCourses, useSemesterHistory } from '@/lib/student-courses/queries'
import { useMyGrades } from '@/lib/course-details/queries/gradebook-queries'
import { CourseCard } from '@/components/teacher-courses/course-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/components/card'
import { Button } from '@/features/ui/components/button'
import { Badge } from '@/features/ui/components/badge'
import { Skeleton } from '@/features/ui/components/skeleton'
import { AlertCircle, BookOpen, Award, Calendar, Clock } from 'lucide-react'
import type { StudentCourse } from '@/lib/student-courses/types'
import type { MyGradeItem } from '@/lib/course-details/services/gradebook-types'

export function StudentDashboard() {
  const user = useAuthStore((state) => state.user)
  const coursesQuery = useStudentCourses(true)
  const semesterQuery = useSemesterHistory(true)
  const [allGrades, setAllGrades] = useState<Record<string, any>>({})
  const [gradesLoading, setGradesLoading] = useState(true)

  const courses = coursesQuery.data?.offerings || []

  // Fetch grades for all courses
  useEffect(() => {
    const fetchAllGrades = async () => {
      if (courses.length === 0) {
        setGradesLoading(false)
        return
      }

      try {
        setGradesLoading(true)
        const gradeMap: Record<string, any> = {}

        // Fetch grades sequentially to avoid race conditions
        for (const course of courses) {
          try {
            const response = await fetch(`/api/gradebook/${course.id}/me`)
            if (response.ok) {
              const grades = await response.json()
              gradeMap[course.id] = grades
            }
          } catch (err) {
            console.error(`Failed to fetch grades for course ${course.id}:`, err)
          }
        }

        setAllGrades(gradeMap)
      } finally {
        setGradesLoading(false)
      }
    }

    if (courses.length > 0) {
      fetchAllGrades()
    }
  }, [courses])

  // Calculate overall GPA from all course grades
  const calculateGPA = (): string | null => {
    const allItems: MyGradeItem[] = []

    Object.values(allGrades).forEach((grades: any) => {
      if (grades.items && Array.isArray(grades.items)) {
        allItems.push(...grades.items)
      }
    })

    if (allItems.length === 0) return null

    const gradedItems = allItems.filter((item) => item.pct !== null)
    if (gradedItems.length === 0) return null

    const avgPct = gradedItems.reduce((sum, item) => sum + (item.pct || 0), 0) / gradedItems.length
    // Convert percentage to 4.0 GPA scale
    const gpa = (avgPct / 25).toFixed(2)
    return parseFloat(gpa) > 4.0 ? '4.0' : gpa
  }

  // Get upcoming assignments due within 7 days
  const getUpcomingAssignments = (): Array<MyGradeItem & { courseName?: string; courseId: string }> => {
    const assignments: Array<MyGradeItem & { courseName?: string; courseId: string }> = []
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    Object.entries(allGrades).forEach(([courseId, grades]: [string, any]) => {
      const course = courses.find((c) => c.id === courseId)
      if (!grades.items) return

      grades.items.forEach((item: MyGradeItem) => {
        if (item.kind === 'assignment' && item.dueAt && !item.submitted) {
          const dueDate = new Date(item.dueAt)
          if (dueDate >= now && dueDate <= sevenDaysFromNow) {
            assignments.push({
              ...item,
              courseId,
              courseName: course?.courseName
            })
          }
        }
      })
    })

    return assignments.sort((a, b) => {
      const dateA = a.dueAt ? new Date(a.dueAt).getTime() : 0
      const dateB = b.dueAt ? new Date(b.dueAt).getTime() : 0
      return dateA - dateB
    })
  }

  // Get recent graded items
  const getRecentActivity = (): Array<MyGradeItem & { courseName?: string; courseId: string }> => {
    const activities: Array<MyGradeItem & { courseName?: string; courseId: string }> = []

    Object.entries(allGrades).forEach(([courseId, grades]: [string, any]) => {
      const course = courses.find((c) => c.id === courseId)
      if (!grades.items) return

      grades.items.forEach((item: MyGradeItem) => {
        if (item.grade !== undefined && item.grade !== null) {
          activities.push({
            ...item,
            courseId,
            courseName: course?.courseName
          })
        }
      })
    })

    return activities.slice(0, 5)
  }

  const gpa = calculateGPA()
  const upcomingAssignments = getUpcomingAssignments()
  const recentActivity = getRecentActivity()
  const currentSemester = semesterQuery.data?.semesters?.[0]?.semesterName || 'Current Semester'

  const isLoading = coursesQuery.isLoading || gradesLoading
  const hasError = coursesQuery.error

  if (hasError) {
    return (
      <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center'>
        <AlertCircle className='mx-auto mb-4 h-12 w-12 text-destructive' />
        <p className='text-destructive font-medium'>Failed to load dashboard</p>
        <p className='text-sm text-muted-foreground mt-1'>Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className='space-y-8 pb-8'>
      {/* Header */}
      <div className='flex items-center space-x-4'>
        {user?.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.name || 'User'}
            className='h-16 w-16 rounded-full object-cover'
          />
        )}
        <div>
          <h1 className='text-3xl font-bold'>Welcome back, {user?.name || 'Student'}!</h1>
          <p className='text-muted-foreground'>Here&apos;s what&apos;s happening in your courses</p>
        </div>
      </div>

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
            icon={<BookOpen className='h-6 w-6' />}
            title='Courses'
            value={courses.length}
            color='blue'
          />
          <SummaryCard
            icon={<Clock className='h-6 w-6' />}
            title='Due Soon'
            value={upcomingAssignments.length}
            color='orange'
          />
          <SummaryCard
            icon={<Award className='h-6 w-6' />}
            title='GPA'
            value={gpa || 'N/A'}
            color='green'
          />
          <SummaryCard
            icon={<Calendar className='h-6 w-6' />}
            title='Semester'
            value={currentSemester}
            color='purple'
          />
        </div>
      )}

      {/* My Courses Section */}
      <div>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-2xl font-bold'>My Courses</h2>
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
            {courses.map((course: StudentCourse) => (
              <CourseCard
                key={course.id}
                course={{
                  id: course.id,
                  courseCode: course.courseCode,
                  courseName: course.courseName,
                  department: course.department,
                  section: course.section,
                  thumbnail: course.thumbnail,
                  totalStudents: 0,
                  totalLessons: course.totalLessons,
                  schedule: Array.isArray(course.schedule) && course.schedule[0]
                    ? { day: String(course.schedule[0].day), time: course.schedule[0].time || '', location: '' }
                    : undefined,
                  status: course.status
                }}
              />
            ))}
          </div>
        ) : (
          <Card className='bg-muted/50'>
            <CardContent className='flex h-48 items-center justify-center text-center'>
              <div>
                <BookOpen className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
                <p className='text-muted-foreground'>No courses enrolled</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Due Soon Section */}
      {!isLoading && upcomingAssignments.length > 0 && (
        <div>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-2xl font-bold'>Due Soon</h2>
            <Button variant='ghost' size='sm'>
              View All
            </Button>
          </div>

          <div className='space-y-2'>
            {upcomingAssignments.map((assignment, idx) => (
              <Card key={`${assignment.courseId}-${idx}`} className='transition-colors hover:bg-accent'>
                <CardContent className='flex items-center justify-between p-4'>
                  <div className='flex-1'>
                    <p className='font-medium'>{assignment.title}</p>
                    <p className='text-sm text-muted-foreground'>{assignment.courseName}</p>
                  </div>
                  <div className='text-right'>
                    <Badge variant='outline' className='mb-2 ml-4'>
                      {assignment.kind}
                    </Badge>
                    <p className='text-sm text-muted-foreground'>Due {formatDate(assignment.dueAt ?? undefined)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      {!isLoading && recentActivity.length > 0 && (
        <div>
          <h2 className='mb-4 text-2xl font-bold'>Recent Grades</h2>
          <div className='space-y-2'>
            {recentActivity.map((activity, idx) => (
              <Card key={`${activity.courseId}-${idx}`}>
                <CardContent className='flex items-center justify-between p-4'>
                  <div className='flex-1'>
                    <p className='font-medium'>{activity.title}</p>
                    <p className='text-sm text-muted-foreground'>{activity.courseName}</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-lg font-bold'>
                      {activity.grade !== null ? `${activity.grade}%` : 'N/A'}
                    </p>
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

export default StudentDashboard

// ============================================================================
// Sub-components
// ============================================================================

interface SummaryCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  color: 'blue' | 'orange' | 'green' | 'purple'
}

function SummaryCard({ icon, title, value, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
    green: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200'
  }

  return (
    <Card className={colorClasses[color]}>
      <CardContent className='flex items-center space-x-4 p-4'>
        <div className='opacity-80'>{icon}</div>
        <div className='flex-1'>
          <p className='text-sm font-medium opacity-70'>{title}</p>
          <p className='text-2xl font-bold'>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(date: string | undefined): string {
  if (!date) return 'Unknown'

  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dateStr = d.toDateString()
  const todayStr = today.toDateString()
  const tomorrowStr = tomorrow.toDateString()

  if (dateStr === todayStr) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
