'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar, Users } from 'lucide-react';

export interface TeacherCourseCardData {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  section: string;
  thumbnail: string | null;
  totalStudents: number;
  totalLessons: number;
  schedule?: { day: string; time: string; location: string };
  status: string;
}

interface CourseCardProps {
  course: TeacherCourseCardData;
  index: number;
}

const GRADIENTS = [
  'from-indigo-500 via-violet-500 to-fuchsia-500',
  'from-sky-500 via-blue-500 to-indigo-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-amber-500 via-orange-500 to-rose-500',
  'from-rose-500 via-pink-500 to-purple-500'
];

function gradientFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function CourseCard({ course }: CourseCardProps) {
  const cover = course.thumbnail?.trim();
  const initials = (course.courseCode || course.courseName || 'C').slice(0, 2).toUpperCase();

  return (
    <Link href={`/dashboard/courses/${course.id}`}>
      <div className='overflow-hidden rounded-lg border transition-colors hover:bg-muted/30'>
        <div className='relative h-28 overflow-hidden'>
          {cover ? (
            <Image src={cover} alt={course.courseName} fill unoptimized className='object-cover' />
          ) : (
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(
                course.courseCode || course.courseName || ''
              )}`}
            >
              <span className='text-3xl font-bold text-white/90'>{initials}</span>
            </div>
          )}
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
          <span
            className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              course.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'
            }`}
          >
            {course.status}
          </span>
        </div>

        <div className='p-3'>
          <span className='text-xs font-medium text-primary'>{course.courseCode}</span>
          <h3 className='mb-1 line-clamp-1 text-sm font-medium'>{course.courseName}</h3>
          <p className='mb-2 text-xs text-muted-foreground'>
            {course.section} / {course.department}
          </p>
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Users className='size-3' />
              {course.totalStudents}
            </span>
            <span className='flex items-center gap-1'>
              <BookOpen className='size-3' />
              {course.totalLessons}
            </span>
            {course.schedule && (
              <span className='flex items-center gap-1'>
                <Calendar className='size-3' />
                {course.schedule.day}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
