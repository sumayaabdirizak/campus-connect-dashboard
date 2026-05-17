'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Search,
  Plus,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react';

interface CourseOverviewProps {
  data: { schedules: any[]; toReview: any[] } | null;
  isStudent?: boolean;
}

const upcoming = [{ id: 1, type: 'assignment', title: 'Assignment 3', dueDate: 'Apr 25' }];

export function CourseOverview({ data, isStudent }: CourseOverviewProps) {
  const [search, setSearch] = useState('');

  return (
    <div className='space-y-6'>
      {/* Info Cards */}
      <div className='grid grid-cols-4 gap-3'>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Calendar className='w-4 h-4' />
            <span className='text-xs'>Next Class</span>
          </div>
          <p className='font-medium'>Monday</p>
        </div>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <MapPin className='w-4 h-4' />
            <span className='text-xs'>Location</span>
          </div>
          <p className='font-medium'>Lab 4</p>
        </div>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Clock className='w-4 h-4' />
            <span className='text-xs'>Time</span>
          </div>
          <p className='font-medium'>09:00 AM</p>
        </div>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Users className='w-4 h-4' />
            <span className='text-xs'>Students</span>
          </div>
          <p className='font-medium'>45</p>
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className='text-lg font-semibold mb-3'>Upcoming</h2>
        <div className='space-y-2'>
          {upcoming.map((item) => (
            <div
              key={item.id}
              className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20'
            >
              <div className='flex items-center gap-3'>
                <div className='w-1 h-8 rounded-full bg-blue-500' />
                <div>
                  <p className='font-medium'>{item.title}</p>
                  <p className='text-xs text-muted-foreground'>Due {item.dueDate}</p>
                </div>
              </div>
              <ChevronRight className='w-4 h-4 text-muted-foreground' />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className='text-lg font-semibold mb-3'>Quick Links</h2>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' className='gap-1'>
            <FileText className='w-4 h-4' />
            Syllabus
          </Button>
          <Button variant='outline' size='sm' className='gap-1'>
            <Download className='w-4 h-4' />
            Resources
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2 space-y-4'>
          {/* To Review */}
          <div className='border rounded-lg p-4'>
            <h3 className='font-medium mb-3'>{isStudent ? 'Pending Tasks' : 'To Review'}</h3>
            <p className='text-sm text-muted-foreground'>No items</p>
          </div>
        </div>
        <div className='space-y-4'>
          <div className='border rounded-lg p-4'>
            <h3 className='font-medium mb-3'>This Week</h3>
            {data?.schedules?.map((s, i) => (
              <div key={i} className='flex justify-between text-sm mb-2'>
                <span className='text-muted-foreground'>{s.start_time}</span>
                <span>{s.location}</span>
              </div>
            )) || <p className='text-sm text-muted-foreground'>No classes</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
