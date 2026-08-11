'use client';

import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import { Plus } from 'lucide-react';

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
    <>
      {!isStudent && !isLoading ? (
        <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
          <span>
            {groupCount} group{groupCount !== 1 ? 's' : ''}
          </span>
          <span>·</span>
          <span>
            {assignedCount} / {totalStudents} students assigned
          </span>
          {unassignedCount > 0 ? (
            <Badge variant='outline' className='text-warning border-warning text-[10px]'>
              {unassignedCount} unassigned
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className='flex gap-2'>
        <Input
          placeholder='Search groups...'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className='max-w-xs'
        />
        {!isStudent ? (
          <Button onClick={onCreate} className='gap-1'>
            <Plus className='w-4 h-4' /> Create Group
          </Button>
        ) : null}
      </div>
    </>
  );
}
