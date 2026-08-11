'use client';

import { Button } from '@/features/ui/components/button';
import { Input } from '@/features/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { FolderPlus, Plus, Search } from 'lucide-react';
import { humanizeType } from '../resource-renderers';
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
    <div className='flex flex-wrap gap-2'>
      <div className='relative flex-1 min-w-[10rem] max-w-xs'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
        <Input
          placeholder='Search...'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-10'
          aria-label='Search materials'
        />
      </div>
      <Select
        value={typeFilter}
        onValueChange={(v) => onTypeFilterChange(v as ResourceTypeFilter)}
      >
        <SelectTrigger className='w-36 sm:w-44'>
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
      {!isStudent ? (
        <>
          <Button variant='outline' onClick={onAddModule} className='gap-1'>
            <FolderPlus className='w-4 h-4' />
            <span className='hidden sm:inline'>Add module</span>
          </Button>
          <Button onClick={onAddMaterial} className='gap-1'>
            <Plus className='w-4 h-4' />
            <span className='hidden sm:inline'>Add material</span>
          </Button>
        </>
      ) : null}
    </div>
  );
}
