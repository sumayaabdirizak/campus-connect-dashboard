'use client';

import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Plus } from 'lucide-react';
import type { Resource } from '../../api/resources-types';
import { ResourceList } from './resource-list';
import type { ReorderResourcesFn } from './types';

interface UngroupedBucketProps {
  resources: Resource[];
  isStudent?: boolean;
  onAdd?: () => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderResources?: ReorderResourcesFn;
}

export function UngroupedBucket({
  resources,
  isStudent,
  onAdd,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderResources
}: UngroupedBucketProps) {
  return (
    <Accordion
      type='single'
      collapsible
      defaultValue='ungrouped'
      className='border rounded-lg border-dashed'
    >
      <AccordionItem value='ungrouped' className='border-0'>
        <div className='flex items-center gap-2 px-3'>
          <AccordionTrigger className='flex-1 hover:no-underline py-3'>
            <div className='flex items-center gap-2 min-w-0'>
              <p className='font-medium text-left truncate'>Ungrouped</p>
              <span className='text-xs text-muted-foreground shrink-0'>
                {resources.length} {resources.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </AccordionTrigger>
          {!isStudent && onAdd ? (
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7'
              onClick={onAdd}
              aria-label='Add ungrouped material'
            >
              <Plus className='w-3.5 h-3.5' />
            </Button>
          ) : null}
        </div>
        <AccordionContent className='px-3 pb-3'>
          {resources.length === 0 ? (
            <p className='text-xs text-muted-foreground italic'>
              {isStudent
                ? 'Nothing here yet.'
                : 'Materials added without a module land here. Edit a resource and pick a module to organize.'}
            </p>
          ) : (
            <ResourceList
              resources={resources}
              moduleId={null}
              isStudent={isStudent}
              onEditResource={onEditResource}
              onDeleteResource={onDeleteResource}
              onAnalytics={onAnalytics}
              onReorderResources={onReorderResources}
            />
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
