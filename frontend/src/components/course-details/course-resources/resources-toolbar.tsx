'use client';

import { Button } from '@/features/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { FolderPlus, Plus } from 'lucide-react';
import { humanizeType } from '../resource-renderers';
import { CourseTabHeader } from '../_shared/course-tab-header';
import { RESOURCE_TYPES, type ResourceTypeFilter } from './constants';

export function ResourcesToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  isStudent,
  onAddModule,
  onAddMaterial
}: {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: ResourceTypeFilter;
  onTypeFilterChange: (v: ResourceTypeFilter) => void;
  isStudent: boolean;
  onAddModule: () => void;
  onAddMaterial: () => void;
}) {
  return (
    <div className='space-y-3'>
      <CourseTabHeader
        title='Resources'
        description={
          isStudent
            ? 'Course materials shared by your lecturer.'
            : 'Organize modules and share course materials.'
        }
        search={{
          value: search,
          onChange: onSearchChange,
          placeholder: 'Search materials…',
          'aria-label': 'Search materials'
        }}
        actions={
          !isStudent ? (
            <>
              <Button variant='outline' size='sm' onClick={onAddModule} className='gap-1.5 rounded-full'>
                <FolderPlus className='size-4' />
                Add module
              </Button>
              <Button size='sm' onClick={onAddMaterial} className='gap-1.5 rounded-full'>
                <Plus className='size-4' />
                Add material
              </Button>
            </>
          ) : undefined
        }
      />

      <div className='flex flex-wrap justify-end gap-2'>
        <Select
          value={typeFilter}
          onValueChange={(v) => onTypeFilterChange(v as ResourceTypeFilter)}
        >
          <SelectTrigger className='h-9 w-36 border-[#D0D5DD] bg-white sm:w-44 dark:border-border dark:bg-background'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All types</SelectItem>
            {RESOURCE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {humanizeType(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
