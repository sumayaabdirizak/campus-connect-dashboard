'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, FileText, MoreVertical, Calendar } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface TeacherCourseCardProps {
  offering: {
    id: number;
    courseCode: string;
    courseName: string;
    department: string;
    section: string;
    thumbnail: string | null;
    pendingSubmissions: number;
    drafts: number;
    nextClass: {
      day: number;
      time: string;
      location: string;
    } | null;
  };
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TeacherCourseCard({ offering }: TeacherCourseCardProps) {
  return (
    <Link href={`/dashboard/courses/${offering.id}`}>
      <Card className='overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-border bg-card rounded-2xl flex flex-col h-full'>
        <div className='relative h-48 w-full overflow-hidden shrink-0'>
          {offering.thumbnail?.trim() ? (
            // `unoptimized` bypasses the Next image optimizer, which in dev
            // refuses to fetch uploads served from localhost (a private IP).
            <Image
              src={offering.thumbnail}
              alt={offering.courseName}
              fill
              unoptimized
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              priority
              className='object-cover group-hover:scale-105 transition-transform duration-700'
            />
          ) : (
            <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500'>
              <span className='text-5xl font-bold text-white/90'>
                {(offering.courseCode || offering.courseName || 'C').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className='absolute top-3 right-3'>
            <Button variant='secondary' size='icon' className='h-8 w-8 bg-background/90 backdrop-blur-md hover:bg-background shadow-sm'>
              <MoreVertical className='h-5 w-5' />
            </Button>
          </div>
        </div>

        <CardContent className='p-5 flex flex-col flex-1'>
          <div className='flex items-center gap-2 mb-3'>
            <Badge
              variant='secondary'
              className='bg-info-muted text-info hover:bg-info-muted/80 font-semibold px-2 py-0 text-[11px] rounded-full border-none'
            >
              {offering.courseCode}
            </Badge>
          </div>

          <h3 className='text-lg font-bold text-foreground leading-tight group-hover:text-muted-foreground transition-colors mb-1.5 line-clamp-2'>
            {offering.courseName}
          </h3>
          <p className='text-[13px] text-muted-foreground font-medium mb-4 flex-1'>
            {offering.department}
          </p>

          <div className='flex flex-wrap items-center gap-2 mb-2'>
            <Badge
              variant='outline'
              className='flex items-center gap-1.5 py-1 px-2.5 text-[11px] bg-card border-border text-muted-foreground rounded-lg hover:bg-muted font-semibold'
            >
              <FileText className='h-[13px] w-[13px] text-muted-foreground stroke-[2.5]' />
              {offering.pendingSubmissions} pending
            </Badge>
            {offering.drafts > 0 && (
              <Badge
                variant='outline'
                className='flex items-center gap-1.5 py-1 px-2.5 text-[11px] bg-card border-border text-muted-foreground rounded-lg hover:bg-muted font-semibold'
              >
                <FileText className='h-[13px] w-[13px] text-muted-foreground stroke-[2.5]' />
                {offering.drafts} drafts
              </Badge>
            )}
          </div>

          {offering.nextClass && (
            <Badge
              variant='outline'
              className='flex items-center gap-1.5 py-1 px-2.5 text-[11px] bg-card border-border text-muted-foreground rounded-lg hover:bg-muted font-semibold w-fit'
            >
              <Clock className='h-[13px] w-[13px] text-muted-foreground stroke-[2.5]' />
              Next: {dayNames[offering.nextClass.day]} {offering.nextClass.time}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
