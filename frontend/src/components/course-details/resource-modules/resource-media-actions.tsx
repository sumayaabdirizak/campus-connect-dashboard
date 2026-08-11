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
    <>
      {onAnalytics && trackable ? (
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7'
          onClick={() => onAnalytics(resource)}
          aria-label={`Watch analytics for ${resource.title}`}
        >
          <BarChart3 className='w-3.5 h-3.5' />
        </Button>
      ) : null}
      {onEditResource ? (
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7'
          onClick={() => onEditResource(resource)}
          aria-label={`Edit ${resource.title}`}
        >
          <Edit className='w-3.5 h-3.5' />
        </Button>
      ) : null}
      {onDeleteResource ? (
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-destructive'
          onClick={() => onDeleteResource(resource.id)}
          aria-label={`Delete ${resource.title}`}
        >
          <Trash2 className='w-3.5 h-3.5' />
        </Button>
      ) : null}
    </>
  );
}
