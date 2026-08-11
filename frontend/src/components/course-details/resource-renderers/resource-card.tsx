'use client';

import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { Download, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { resourceDownloadUrl } from '@/lib/course-details/services/resources-service';
import type { Resource } from '@/lib/course-details/types';
import { humanizeType } from './media-helpers';
import { MimeIcon } from './mime-icon';

export interface ResourceCardProps {
  resource: Resource;
  isStudent?: boolean;
  onEdit?: (r: Resource) => void;
  onDelete?: (id: number) => void;
  dragHandle?: React.ReactNode;
}

export function ResourceCard({
  resource,
  isStudent,
  onEdit,
  onDelete,
  dragHandle
}: ResourceCardProps) {
  const isUploaded = !!resource.originalName;
  const downloadHref = isUploaded ? resourceDownloadUrl(resource.id) : resource.url;
  return (
    <div className='border rounded-lg p-4 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-3 min-w-0'>
        {dragHandle}
        <MimeIcon mime={resource.mimeType} />
        <div className='min-w-0'>
          <p className='font-medium truncate flex items-center gap-2'>
            {resource.title}
            {resource.is_draft && (
              <Badge variant='outline' className='text-[10px]'>
                Draft
              </Badge>
            )}
          </p>
          <p className='text-xs text-muted-foreground'>
            {humanizeType(resource.type)} ·{' '}
            {format(new Date(resource.created_at), 'MMM d, yyyy')}
            {resource.teacher?.full_name ? ` · ${resource.teacher.full_name}` : ''}
            {resource.originalName ? ` · ${resource.originalName}` : ''}
          </p>
          {resource.description && (
            <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
              {resource.description}
            </p>
          )}
        </div>
      </div>
      <div className='flex gap-1 shrink-0'>
        <a
          href={downloadHref}
          {...(isUploaded
            ? { download: resource.originalName ?? true }
            : { target: '_blank', rel: 'noreferrer' })}
          className='inline-flex items-center gap-1 text-sm border rounded-md px-3 py-1.5 hover:bg-muted/30'
          aria-label={`Download ${resource.title}`}
        >
          <Download className='w-4 h-4' />
          <span className='hidden sm:inline'>Download</span>
        </a>
        {!isStudent && onEdit && (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => onEdit(resource)}
            aria-label={`Edit ${resource.title}`}
          >
            <Edit className='w-3.5 h-3.5' />
          </Button>
        )}
        {!isStudent && onDelete && (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 text-destructive'
            onClick={() => onDelete(resource.id)}
            aria-label={`Delete ${resource.title}`}
          >
            <Trash2 className='w-3.5 h-3.5' />
          </Button>
        )}
      </div>
    </div>
  );
}
