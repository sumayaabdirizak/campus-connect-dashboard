'use client';

import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { Icons } from '@/components/icons';

export function UserManagementHeader({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <>
      <div className='flex items-start justify-between gap-2'>
        <p className='text-muted-foreground text-sm'>
          Manage lecturers, students, and academic assignments.
        </p>
        <Button variant='outline' size='sm'>
          <Icons.download className='mr-2 h-4 w-4' /> Export
        </Button>
      </div>
      <div className='flex items-center space-x-2'>
        <div className='relative max-w-sm flex-1'>
          <Icons.search className='text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4' />
          <Input
            placeholder='Search by name or email...'
            className='pl-8'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}
