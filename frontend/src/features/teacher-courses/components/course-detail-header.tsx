'use client';

import { Button } from '@/components/ui/button';
import { Scan, Settings } from 'lucide-react';
import { NotificationToggle } from '@/features/notifications/notification-toggle';

interface CourseDetailHeaderProps {
  course: { code: string; name: string; department: { name: string } };
  section: { name: string };
  batch: { name: string };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isStudent?: boolean;
}

export function CourseDetailHeader({
  course,
  section,
  batch,
  activeTab,
  setActiveTab,
  isStudent
}: CourseDetailHeaderProps) {
  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'feed', name: 'Feed' },
    { id: 'chat', name: 'Chat' },
    { id: 'assignments', name: 'Assignments' },
    { id: 'quizzes', name: 'Quizzes' },

    { id: 'attendance', name: 'Attendance' },
    { id: 'resources', name: 'Resources' },
    { id: 'groups', name: 'Groups' },
    ...(!isStudent ? [{ id: 'roster', name: 'Roster' }] : [])
  ];

  return (
    <div className='space-y-3 sm:space-y-4'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h1 className='text-xl sm:text-2xl font-bold truncate'>
            {course.code} — {course.name}
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground truncate'>
            {course.department.name} • Batch {batch.name} • {section.name}
          </p>
        </div>
        <div className='flex gap-2'>
          <NotificationToggle />
          {!isStudent && (
            <Button variant='outline' size='sm' className='gap-1'>
              <Scan className='w-4 h-4' /> Attendance
            </Button>
          )}
        </div>
      </div>

      <div className='border-b'>
        <div className='flex gap-6 overflow-x-auto'>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
