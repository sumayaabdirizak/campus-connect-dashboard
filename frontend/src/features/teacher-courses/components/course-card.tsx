'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Users, Calendar } from 'lucide-react';

interface CourseCardProps {
  course: {
    id: number;
    courseCode: string;
    courseName: string;
    department: string;
    section: string;
    thumbnail: string | null;
    totalStudents: number;
    totalLessons: number;
    schedule?: { day: string; time: string; location: string };
    status: string;
  };
  index: number;
}

const defaultImages = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400&h=200&fit=crop'
];

export function CourseCard({ course, index }: CourseCardProps) {
  const imageUrl = course.thumbnail || defaultImages[index % defaultImages.length];

  return (
    <Link href={`/dashboard/courses/${course.id}`}>
      <div className='border rounded-lg overflow-hidden hover:bg-muted/30 transition-colors'>
        <div className='relative h-28 overflow-hidden'>
          <Image src={imageUrl} alt={course.courseName} fill className='object-cover' />
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
          <span
            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              course.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted'
            }`}
          >
            {course.status}
          </span>
        </div>
        <div className='p-3'>
          <span className='text-xs font-medium text-primary'>{course.courseCode}</span>
          <h3 className='font-medium text-sm mb-1 line-clamp-1'>{course.courseName}</h3>
          <p className='text-xs text-muted-foreground mb-2'>
            {course.section} · {course.department}
          </p>
          <div className='flex items-center gap-3 text-xs text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Users className='w-3 h-3' />
              {course.totalStudents}
            </span>
            <span className='flex items-center gap-1'>
              <BookOpen className='w-3 h-3' />
              {course.totalLessons}
            </span>
            {course.schedule && (
              <span className='flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                {course.schedule.day}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
