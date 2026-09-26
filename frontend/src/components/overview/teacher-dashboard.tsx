'use client'

import { useMemo, useState } from 'react'
import { useTeacherCourses } from '@/lib/teacher-courses/queries'
import type { Course } from '@/lib/teacher-courses/types'
import { useRecentAnnouncements } from '@/lib/announcements/queries'
import { useCalendarDeadlines } from '@/lib/calendar/queries'
import { filterUpcomingDeadlines } from '@/components/calendar/deadline-calendar'
import { MonthCalendar } from './month-calendar'
import { TeacherDashboardHero } from './teacher-dashboard-hero'
import { TeacherCoursesPanel } from './teacher-courses-panel'
import { AnnouncementsSidebarCard } from './announcements-sidebar-card'
import { StudentDashboardDeadlines } from './student-dashboard-deadlines'

type CourseFilter = 'all' | 'active' | 'completed'

/** Teacher home — Moodle-like: banner, calendar focus, rail, courses. */
export function TeacherDashboard({ user }: { user: { full_name?: string } }) {
  const [filter, setFilter] = useState<CourseFilter>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'card' | 'list'>('card')

  const { data: coursesData, isLoading: coursesLoading } = useTeacherCourses()
  const { data: announcementsData, isLoading: announcementsLoading } = useRecentAnnouncements(5)
  const courses = (coursesData ?? []) as Course[]
  const announcements = announcementsData ?? []

  const { fromIso, toIso } = useMemo(() => {
    const now = new Date()
    return {
      fromIso: now.toISOString(),
      toIso: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }, [])

  const { data: deadlineData, isLoading: deadlinesLoading } = useCalendarDeadlines(
    fromIso,
    toIso
  )

  const timelineItems = useMemo(
    () => filterUpcomingDeadlines(deadlineData?.results),
    [deadlineData]
  )

  const filteredCourses = courses.filter((c) => {
    const matchFilter =
      filter === 'active'
        ? c.status === 'active'
        : filter === 'completed'
          ? c.status === 'completed' || c.status === 'archived'
          : true
    const q = search.trim().toLowerCase()
    const matchSearch =
      !q ||
      c.courseName.toLowerCase().includes(q) ||
      (c.courseCode || '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalStudents = courses.reduce((a, c) => a + (c.totalStudents || 0), 0)
  const activeCourses = courses.filter((c) => c.status === 'active').length
  const dueThisWeek = timelineItems.filter(
    (deadline) =>
      deadline.deadlineAt &&
      new Date(deadline.deadlineAt).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
  ).length
  const firstName = user?.full_name?.split(' ')[0]
  const pendingGrading = courses.reduce((a, c) => a + (c.pendingSubmissions || 0), 0)

  return (
    <div className='flex-1 space-y-4 pb-8'>
      <TeacherDashboardHero
        loading={coursesLoading || deadlinesLoading}
        firstName={firstName}
        pendingGrading={pendingGrading}
        coursesCount={courses.length}
        totalStudents={totalStudents}
        activeCourses={activeCourses}
        dueThisWeek={dueThisWeek}
        timelineCount={timelineItems.length}
      />

      <section
        aria-label='Calendar'
        className='grid grid-cols-1 items-start gap-4 xl:grid-cols-12'
      >
        <div className='xl:col-span-8'>
          <MonthCalendar variant='featured' />
        </div>
        <aside className='space-y-4 xl:col-span-4'>
          <StudentDashboardDeadlines items={timelineItems} loading={deadlinesLoading} />
          <AnnouncementsSidebarCard
            announcements={announcements}
            loading={announcementsLoading}
          />
        </aside>
      </section>

      <TeacherCoursesPanel
        coursesLoading={coursesLoading}
        filteredCourses={filteredCourses}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />
    </div>
  )
}


