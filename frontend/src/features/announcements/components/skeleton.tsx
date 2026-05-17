import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PostSkeleton() {
  return (
    <Card className='overflow-hidden rounded-2xl border-border/60 border-s-[3px] border-s-transparent bg-background py-0 shadow-[0_1px_0_rgba(0,0,0,0.03)]'>
      <CardContent className='space-y-3 p-4 sm:p-5'>
        <div className='flex items-center gap-3'>
          <Skeleton className='size-9 rounded-full' />
          <div className='flex-1 space-y-1.5'>
            <Skeleton className='h-3 w-40 rounded' />
            <Skeleton className='h-2.5 w-24 rounded' />
          </div>
        </div>
        <div className='ps-[44px] sm:ps-[46px]'>
          <Skeleton className='h-4 w-2/3 rounded' />
          <div className='mt-2 space-y-1.5'>
            <Skeleton className='h-2.5 w-full rounded' />
            <Skeleton className='h-2.5 w-11/12 rounded' />
            <Skeleton className='h-2.5 w-5/6 rounded' />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnnouncementListSkeleton() {
  return (
    <div className='space-y-2 px-2 py-2 sm:px-3'>
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}
