'use client'

import { useState } from 'react'
import { MonthCalendar } from './month-calendar'
import { AnnouncementsSidebarCard } from './announcements-sidebar-card'
import { CourseOverviewSection } from './course-overview-section'
import { StudentDashboardHero } from './student-dashboard-hero'
import { StudentDashboardDeadlines } from './student-dashboard-deadlines'
import { StudentDashboardGroups } from './student-dashboard-groups'
import { useStudentDashboardData, type CourseFilter } from './use-student-dashboard-data'

/** Student home — calendar is the primary focus. */
export function StudentDashboard({ user }: { user: { full_name?: string } }) {
  const [filter, setFilter] = useState<CourseFilter>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'card' | 'list'>('card')

  const {
    courses,
    announcements,
    announcementsLoading,
    coursesLoading,
    deadlinesLoading,
    timelineItems,
    lessonsDone,
    lessonsTotal,
    overallPct,
    assignments,
    dueThisWeek,
    nextUp,
  } = useStudentDashboardData()

  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className='flex-1 space-y-6 pb-8'>
      <StudentDashboardHero
        firstName={firstName}
        coursesLoading={coursesLoading}
        deadlinesLoading={deadlinesLoading}
        nextUp={nextUp}
        lessonsTotal={lessonsTotal}
        overallPct={overallPct}
        coursesCount={courses.length}
        lessonsDone={lessonsDone}
        assignments={assignments}
        dueThisWeek={dueThisWeek}
      />

      <section
        aria-label='Calendar and courses'
        className='grid grid-cols-1 items-start gap-4 xl:grid-cols-12'
      >
        <div className='space-y-4 xl:col-span-8'>
          <MonthCalendar variant='featured' />
          <CourseOverviewSection
            courses={courses}
            coursesLoading={coursesLoading}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            view={view}
            onViewChange={setView}
          />
        </div>
        <aside className='space-y-4 xl:col-span-4'>
          <StudentDashboardDeadlines items={timelineItems} loading={deadlinesLoading} />
          <StudentDashboardGroups />
          <AnnouncementsSidebarCard
            announcements={announcements}
            loading={announcementsLoading}
          />
        </aside>
      </section>
    </div>
  )
}
