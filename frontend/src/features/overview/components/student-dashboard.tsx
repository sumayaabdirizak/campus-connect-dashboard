'use client';

import { useState } from 'react';
import { MonthCalendar } from './month-calendar';
import { AnnouncementsSidebarCard } from './announcements-sidebar-card';
import { CourseOverviewSection } from './course-overview-section';
import { StudentDashboardHero } from './student-dashboard-hero';
import { useStudentDashboardData, type CourseFilter } from './use-student-dashboard-data';

export function StudentDashboard({ user }: { user: { full_name?: string } }) {
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'card' | 'list'>('card');

  const {
    courses,
    announcements,
    coursesLoading,
    deadlinesLoading,
    lessonsDone,
    lessonsTotal,
    overallPct,
    assignments,
    dueThisWeek,
    nextUp,
  } = useStudentDashboardData();

  const firstName = user?.full_name?.split(' ')[0];

  return (
    <div className='flex-1 space-y-6'>
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

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
        <div className='flex flex-col gap-6 lg:col-span-8'>
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

        <div className='flex flex-col gap-6 lg:col-span-4'>
          <MonthCalendar />
          <AnnouncementsSidebarCard announcements={announcements} />
        </div>
      </div>
    </div>
  );
}
