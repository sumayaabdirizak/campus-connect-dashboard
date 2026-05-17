'use client';

import { Button } from '@/components/ui/button';
import { Scan, Settings } from 'lucide-react';

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

    { id: 'attendance', name: 'Attendance' },
    { id: 'resources', name: 'Resources' },
    { id: 'groups', name: 'Groups' },
    ...(!isStudent ? [{ id: 'roster', name: 'Roster' }] : [])
  ];

  return (
    <div className='space-y-4'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold'>
            {course.code} — {course.name}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {course.department.name} • Batch {batch.name} • {section.name}
          </p>
        </div>
        {!isStudent && (
          <div className='flex gap-2'>
            <Button variant='outline' size='sm' className='gap-1'>
              <Scan className='w-4 h-4' /> Attendance
            </Button>
          </div>
        )}
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
