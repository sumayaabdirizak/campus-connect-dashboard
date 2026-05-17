'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Calendar, User as UserIcon, MapPin, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

interface StudentCourseCardProps {
  offering: {
    id: number;
    courseCode: string;
    courseName: string;
    instructor: string;
    department: string;
    section: string;
    thumbnail: string | null;
    pendingItems: number;
    progress: number;
    nextClass: {
      day: number;
      time: string;
      location: string;
    } | null;
  };
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StudentCourseCard({ offering }: StudentCourseCardProps) {
  return (
    <Link href={`/dashboard/courses/${offering.id}`}>
      <Card className='overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200 bg-white rounded-2xl flex flex-col h-full'>
        <div className='relative h-48 w-full overflow-hidden shrink-0'>
          <Image
            src={
              offering.thumbnail ||
              `https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800`
            }
            alt={offering.courseName}
            fill
            sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            priority
            className='object-cover group-hover:scale-105 transition-transform duration-700'
          />
          <div className='absolute top-3 right-3'>
            <button className='p-1.5 rounded-lg bg-white/90 backdrop-blur-md hover:bg-white transition-colors shadow-sm text-slate-700'>
              <MoreVertical className='h-5 w-5' />
            </button>
          </div>
        </div>

        <CardContent className='p-5 flex flex-col flex-1'>
          <div className='flex items-center gap-2 mb-3'>
            <Badge
              variant='secondary'
              className='bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-2 py-0 text-[11px] rounded-full border-none'
            >
              {offering.courseCode}
            </Badge>
          </div>

          <h3 className='text-lg font-bold text-slate-900 leading-tight group-hover:text-slate-700 transition-colors mb-1.5 line-clamp-2 mt-0'>
            {offering.courseName}
          </h3>
          <p className='text-[13px] text-slate-500 font-medium mb-4 flex-1'>
            {offering.department}
          </p>

          <div className='flex flex-wrap items-center gap-2 mb-2'>
            <Badge
              variant='outline'
              className='flex items-center gap-1.5 py-1 px-2.5 text-[11px] bg-white border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold'
            >
              <FileText className='h-[13px] w-[13px] text-slate-400 stroke-[2.5]' />
              {offering.pendingItems} pending tasks
            </Badge>
            <Badge
              variant='outline'
              className='flex items-center gap-1.5 py-1 px-2.5 text-[11px] bg-white border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-semibold'
            >
              <UserIcon className='h-[13px] w-[13px] text-slate-400 stroke-[2.5]' />
              {offering.instructor}
            </Badge>
          </div>

          {offering.nextClass && (
            <Badge
              variant='outline'
              className='flex items-center gap-1.5 py-1 px-2.5 text-[11px] bg-slate-50 border-slate-200 text-slate-600 rounded-lg font-semibold w-fit'
            >
              <Clock className='h-[13px] w-[13px] text-slate-400 stroke-[2.5]' />
              Next: {dayNames[offering.nextClass.day]} {offering.nextClass.time}
            </Badge>
          )}

          {/* Optional bottom progress bar if needed, otherwise matches the mockup layout */}
          <div className='mt-4 pt-3 border-t border-slate-100 w-full space-y-1.5 opacity-80 hover:opacity-100 transition-opacity'>
            <div className='flex justify-between text-[10px] font-semibold px-0.5'>
              <span className='text-slate-500 uppercase tracking-wide'>Progress</span>
              <span className='text-slate-700'>{offering.progress}%</span>
            </div>
            <Progress value={offering.progress} className='h-1 bg-slate-100' />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
