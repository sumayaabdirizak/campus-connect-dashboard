'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  FileText,
  Download
} from 'lucide-react';

interface ScheduleRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  topic?: string | null;
}

interface ToReviewItem {
  id: number;
  type: 'assignment' | 'quiz';
  title: string;
  pendingCount: number;
  status: string;
}

interface OverviewData {
  schedules?: ScheduleRow[];
  toReview?: ToReviewItem[];
  section?: { name: string; _count?: { studentRegistrations: number } };
}

interface CourseOverviewProps {
  data: OverviewData | null;
  isStudent?: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pickNextSchedule(schedules: ScheduleRow[]): ScheduleRow | null {
  if (!schedules || schedules.length === 0) return null;
  const today = new Date().getDay();
  const todaysRow = schedules.find((s) => s.day_of_week === today);
  if (todaysRow) return todaysRow;
  const upcoming = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week);
  const future = upcoming.find((s) => s.day_of_week > today);
  return future ?? upcoming[0];
}

export function CourseOverview({ data, isStudent }: CourseOverviewProps) {
  const schedules = data?.schedules ?? [];
  const toReview = data?.toReview ?? [];
  const studentCount = data?.section?._count?.studentRegistrations ?? 0;

  const next = useMemo(() => pickNextSchedule(schedules), [schedules]);
  const upcoming = useMemo(
    () => toReview.filter((t) => t.type === 'assignment').slice(0, 3),
    [toReview]
  );

  return (
    <div className='space-y-6'>
      {/* Info Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Calendar className='w-4 h-4' />
            <span className='text-xs'>Next Class</span>
          </div>
          <p className='font-medium'>{next ? DAY_NAMES[next.day_of_week] : '—'}</p>
        </div>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <MapPin className='w-4 h-4' />
            <span className='text-xs'>Location</span>
          </div>
          <p className='font-medium'>{next?.location ?? '—'}</p>
        </div>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Clock className='w-4 h-4' />
            <span className='text-xs'>Time</span>
          </div>
          <p className='font-medium'>{next?.start_time ?? '—'}</p>
        </div>
        <div className='border rounded-lg p-3'>
          <div className='flex items-center gap-2 text-muted-foreground mb-1'>
            <Users className='w-4 h-4' />
            <span className='text-xs'>Students</span>
          </div>
          <p className='font-medium'>{studentCount}</p>
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className='text-lg font-semibold mb-3'>Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No assignments waiting.</p>
        ) : (
          <div className='space-y-2'>
            {upcoming.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20'
              >
                <div className='flex items-center gap-3'>
                  <div className='w-1 h-8 rounded-full bg-blue-500' />
                  <div>
                    <p className='font-medium'>{item.title}</p>
                    <p className='text-xs text-muted-foreground'>
                      {item.pendingCount} pending · {item.status}
                    </p>
                  </div>
                </div>
                <ChevronRight className='w-4 h-4 text-muted-foreground' />
              </div>
            ))}
          </div>
        )}
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
          <div className='border rounded-lg p-4'>
            <h3 className='font-medium mb-3'>{isStudent ? 'Pending Tasks' : 'To Review'}</h3>
            {toReview.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No items</p>
            ) : (
              <div className='space-y-2'>
                {toReview.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className='flex items-center justify-between text-sm'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <Badge variant='outline' className='text-[10px] uppercase'>
                        {item.type}
                      </Badge>
                      <span className='truncate'>{item.title}</span>
                    </div>
                    <span className='text-xs text-muted-foreground shrink-0'>
                      {item.pendingCount} pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className='space-y-4'>
          <div className='border rounded-lg p-4'>
            <h3 className='font-medium mb-3'>This Week</h3>
            {schedules.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No classes</p>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className='flex justify-between text-sm mb-2'>
                  <span className='text-muted-foreground'>{s.start_time}</span>
                  <span>{s.location}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
