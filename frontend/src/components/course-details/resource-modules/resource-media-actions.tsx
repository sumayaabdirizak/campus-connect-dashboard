'use client';

import { BarChart3, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { isUploadedAudio, isUploadedVideo } from '../resource-renderers';
import type { Resource } from '@/lib/course-details/types';

export function ResourceMediaActions({
  resource,
  isStudent,
  onEditResource,
  onDeleteResource,
  onAnalytics
}: {
  resource: Resource;
  isStudent?: boolean;
  onEditResource?: (resource: Resource) => void;
  onDeleteResource?: (resourceId: number) => void;
  onAnalytics?: (resource: Resource) => void;
}) {
  if (isStudent) return null;
  const trackable = isUploadedVideo(resource) || isUploadedAudio(resource);
  return (
    <div className='flex flex-wrap items-center gap-2'>
      {onAnalytics && trackable ? (
        <Button
          variant='outline'
          size='sm'
          className='h-9 gap-1.5 rounded-full border-border bg-card px-3.5 font-medium'
          onClick={() => onAnalytics(resource)}
          aria-label={`Watch analytics for ${resource.title}`}
        >
          <BarChart3 className='size-4' />
          Analytics
        </Button>
      ) : null}
      {onEditResource ? (
        <Button
          variant='outline'
          size='sm'
          className='h-9 gap-1.5 rounded-full border-border bg-card px-3.5 font-medium'
          onClick={() => onEditResource(resource)}
          aria-label={`Edit ${resource.title}`}
        >
          <Edit className='size-4' />
          Edit
        </Button>
      ) : null}
      {onDeleteResource ? (
        <Button
          variant='outline'
          size='sm'
          className='h-9 gap-1.5 rounded-full border-destructive/30 bg-card px-3.5 font-medium text-destructive hover:bg-destructive/5'
          onClick={() => onDeleteResource(resource.id)}
          aria-label={`Delete ${resource.title}`}
        >
          <Trash2 className='size-4' />
          Delete
        </Button>
      ) : null}
    </div>
  );
}
