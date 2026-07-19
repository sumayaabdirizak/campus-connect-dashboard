'use client';

import Link from 'next/link';
import { Download, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MainDashboardHeader({
  isFetching,
  onRefresh,
  onExport,
}: {
  isFetching: boolean;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <div className='bg-background/95 sticky top-0 z-20 -mx-4 border-b px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            Welcome back. Here is what is happening in your platform today.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={onRefresh} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={onExport}>
            <Download className='mr-1.5 size-3.5' />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type='button' size='sm'>
                <Plus className='mr-1.5 size-3.5' />
                Add New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-52'>
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href='/dashboard/dean/courses'>Course</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/dashboard/users'>Student account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/dashboard/users'>Instructor account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/dashboard/dean/assigning'>Assignment / Quiz</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/dashboard/announcements'>Announcement</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
