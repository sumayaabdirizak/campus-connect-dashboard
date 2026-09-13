'use client';

import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { Plus } from 'lucide-react';
import { CourseTabHeader } from '../_shared/course-tab-header';

export function GroupsToolbar({
  isStudent,
  isLoading,
  groupCount,
  assignedCount,
  totalStudents,
  unassignedCount,
  search,
  onSearchChange,
  onCreate
}: {
  isStudent: boolean;
  isLoading: boolean;
  groupCount: number;
  assignedCount: number;
  totalStudents: number;
  unassignedCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className='space-y-3'>
      <CourseTabHeader
        title='Groups'
        description={
          isStudent
            ? 'Your course groups and members.'
            : 'Create groups and add several students at once.'
        }
        search={{
          value: search,
          onChange: onSearchChange,
          placeholder: 'Search groups…',
          'aria-label': 'Search groups'
        }}
        actions={
          !isStudent ? (
            <Button onClick={onCreate} size='sm' className='gap-1.5 rounded-full'>
              <Plus className='size-4' />
              Create group
            </Button>
          ) : undefined
        }
      />

      {!isStudent && !isLoading ? (
        <div className='flex flex-wrap items-center gap-2 text-sm'>
          <span className='rounded-full border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground'>
            {groupCount} group{groupCount !== 1 ? 's' : ''}
          </span>
          <span className='rounded-full border border-border bg-muted/40 px-2.5 py-1 font-medium text-foreground'>
            {assignedCount} / {totalStudents} assigned
          </span>
          {unassignedCount > 0 ? (
            <Badge
              variant='outline'
              className='rounded-full border-amber-400 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800'
            >
              {unassignedCount} unassigned
            </Badge>
          ) : (
            <Badge
              variant='outline'
              className='rounded-full border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800'
            >
              All assigned
            </Badge>
          )}
        </div>
      ) : null}
    </div>
  );
}
