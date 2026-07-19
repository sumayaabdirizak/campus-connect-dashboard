'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Edit, Plus, Trash2 } from 'lucide-react';
import type { CourseModule, Resource } from '../../api/resources-types';
import { DragHandle } from './drag-handle';
import { ResourceList } from './resource-list';
import type { ReorderResourcesFn } from './types';

interface ModuleBucketProps {
  module: CourseModule;
  resources: Resource[];
  isStudent?: boolean;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
  onReorderResources?: ReorderResourcesFn;
}

export function ModuleBucket({
  module: mod,
  resources,
  isStudent,
  onAdd,
  onEdit,
  onDelete,
  onEditResource,
  onDeleteResource,
  onAnalytics,
  onReorderResources
}: ModuleBucketProps) {
  const isDraft = !mod.publishedAt;
  if (isStudent && isDraft) return null;

  return (
    <Accordion
      type='single'
      collapsible
      defaultValue={`module-${mod.id}`}
      className='border rounded-lg'
    >
      <AccordionItem value={`module-${mod.id}`} className='border-0'>
        <div className='flex items-center gap-2 px-3'>
          {!isStudent ? <DragHandle /> : null}
          <AccordionTrigger className='flex-1 hover:no-underline py-3'>
            <div className='flex items-center gap-2 min-w-0'>
              <p className='font-medium text-left truncate'>{mod.title}</p>
              {isDraft ? (
                <Badge variant='outline' className='text-[10px]'>
                  Draft
                </Badge>
              ) : null}
              <span className='text-xs text-muted-foreground shrink-0'>
                {resources.length} {resources.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </AccordionTrigger>
          {!isStudent ? (
            <div className='flex items-center gap-1 shrink-0'>
              {onAdd ? (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={onAdd}
                  aria-label={`Add material to ${mod.title}`}
                >
                  <Plus className='w-3.5 h-3.5' />
                </Button>
              ) : null}
              {onEdit ? (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={onEdit}
                  aria-label={`Rename ${mod.title}`}
                >
                  <Edit className='w-3.5 h-3.5' />
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7 text-destructive'
                  onClick={onDelete}
                  aria-label={`Delete ${mod.title}`}
                >
                  <Trash2 className='w-3.5 h-3.5' />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <AccordionContent className='px-3 pb-3'>
          {mod.description ? (
            <p className='text-xs text-muted-foreground mb-3'>{mod.description}</p>
          ) : null}
          <ResourceList
            resources={resources}
            moduleId={mod.id}
            isStudent={isStudent}
            onEditResource={onEditResource}
            onDeleteResource={onDeleteResource}
            onAnalytics={onAnalytics}
            onReorderResources={onReorderResources}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
