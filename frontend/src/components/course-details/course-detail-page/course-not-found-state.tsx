'use client';

import { ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function CourseNotFoundState() {
  const router = useRouter();

  return (
    <div className='flex w-full items-center justify-center py-20'>
      <div className='max-w-md rounded-xl border bg-card p-8 text-center'>
        <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
          <ArrowLeft className='size-5' />
        </div>
        <h2 className='text-xl font-semibold tracking-tight'>Course not found</h2>
        <p className='mt-2 text-sm text-muted-foreground'>
          This course doesn&apos;t exist or you don&apos;t have access.
        </p>
        <div className='mt-6 flex flex-wrap justify-center gap-2'>
          <Button variant='outline' size='sm' onClick={() => router.push('/dashboard/courses')}>
            <ArrowLeft className='size-4' />
            Back to courses
          </Button>
          <Button variant='ghost' size='sm' onClick={() => router.push('/dashboard')}>
            <Home className='size-4' />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
