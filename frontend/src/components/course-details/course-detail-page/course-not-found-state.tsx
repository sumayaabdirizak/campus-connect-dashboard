'use client';

import { ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function go(path: string) {
  // Hard navigation avoids Next soft-nav "Failed to fetch" when the
  // Turbopack/dev server briefly cannot serve the RSC payload.
  window.location.assign(path);
}

export function CourseNotFoundState({ errorMessage }: { errorMessage?: string | null }) {
  const msg = (errorMessage ?? '').trim();
  const network =
    /failed to fetch|could not reach|network|api server|port 4000|econnrefused/i.test(msg);
  const forbidden = /forbidden|access|permission/i.test(msg);

  const title = network
    ? 'Couldn’t reach the server'
    : forbidden
      ? 'No access to this course'
      : 'Course not found';

  const description = network
    ? msg ||
      'The API did not respond. Check that the backend is running on port 4000, then retry.'
    : forbidden
      ? 'You are signed in, but this course belongs to another class or teacher. Open My Courses and pick your own offering.'
      : msg
        ? msg
        : "This course doesn't exist or you don't have access.";

  return (
    <div className='flex w-full items-center justify-center py-20'>
      <div className='max-w-md rounded-xl border bg-card p-8 text-center'>
        <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
          <ArrowLeft className='size-5' />
        </div>
        <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
        <p className='mt-2 text-sm text-muted-foreground'>{description}</p>
        <div className='mt-6 flex flex-wrap justify-center gap-2'>
          {network ? (
            <Button variant='outline' size='sm' onClick={() => window.location.reload()}>
              <RefreshCw className='size-4' />
              Retry
            </Button>
          ) : null}
          <Button variant='outline' size='sm' onClick={() => go('/dashboard/courses')}>
            <ArrowLeft className='size-4' />
            Back to courses
          </Button>
          <Button variant='ghost' size='sm' onClick={() => go('/dashboard')}>
            <Home className='size-4' />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
