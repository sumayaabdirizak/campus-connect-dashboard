'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StudentCourseCardProps {
  course: {
    id: number;
    courseCode: string;
    courseName: string;
    department: string;
    section: string;
    instructor: { name: string };
    totalLessons: number;
    completedLessons: number;
    progress: number;
    thumbnail: string | null;
    nextClass?: { day: string; time: string };
  };
  index: number;
}

const defaultImages = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=200&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop'
];

export function StudentCourseCard({ course, index }: StudentCourseCardProps) {
  const status = course.progress >= 100 ? 'completed' : 'active';
  const imageUrl = course.thumbnail || defaultImages[index % defaultImages.length];

  return (
    <Link href={`/dashboard/courses/${course.id}`}>
      <div className='border rounded-lg overflow-hidden hover:bg-muted/30 transition-colors'>
        <div className='relative h-28 overflow-hidden'>
          <Image src={imageUrl} alt={course.courseName} fill className='object-cover' />
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
          <span
            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {status}
          </span>
        </div>
        <div className='p-3'>
          <span className='text-xs font-medium text-primary'>{course.courseCode}</span>
          <h3 className='font-medium text-sm mb-1 line-clamp-1'>{course.courseName}</h3>
          <p className='text-xs text-muted-foreground mb-2'>
            {course.section} · {course.instructor.name}
          </p>
          <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium'>{course.progress}%</span>
            </div>
            <Progress value={course.progress} className='h-1.5' />
          </div>
        </div>
      </div>
    </Link>
  );
}
