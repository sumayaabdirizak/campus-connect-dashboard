'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Download, Edit, Eye, ExternalLink, Trash2 } from 'lucide-react';
import { Badge } from '@/features/ui/components/badge';
import { Button } from '@/features/ui/components/button';
import { resourceDownloadUrl } from '@/lib/course-details/services/resources-service';
import type { Resource } from '@/lib/course-details/types';
import { cn } from '@/lib/utils';
import { humanizeType } from './media-helpers';
import { MimeIcon } from './mime-icon';
import { ResourcePdfDialog, isPdfResource } from './resource-pdf-dialog';

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
  const canPreview = isPdfResource(resource);
  const openLabel = isUploaded ? 'Download' : 'Open link';
  const OpenIcon = isUploaded ? Download : ExternalLink;
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <article
      className={cn(
        'min-w-0 rounded-xl border-2 border-border bg-card p-4 text-foreground',
      )}
    >
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 items-start gap-3'>
          {dragHandle}
          <div className='flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10'>
            <MimeIcon mime={resource.mimeType} className='size-6 text-primary' />
          </div>
          <div className='min-w-0 space-y-1.5'>
            <div className='flex flex-wrap items-center gap-2'>
              <h3 className='truncate text-base font-semibold tracking-tight text-foreground'>
                {resource.title}
              </h3>
              {resource.is_draft ? (
                <Badge variant='secondary' size='xs' className='rounded-full'>
                  Draft
                </Badge>
              ) : null}
            </div>
            <div className='flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground'>
              <span className='rounded-full border border-border bg-muted px-2 py-0.5'>
                {humanizeType(resource.type)}
              </span>
              <span className='text-muted-foreground'>·</span>
              <span>{format(new Date(resource.created_at), 'MMM d, yyyy')}</span>
              {resource.teacher?.full_name ? (
                <>
                  <span className='text-muted-foreground'>·</span>
                  <span className='truncate'>{resource.teacher.full_name}</span>
                </>
              ) : null}
            </div>
            {resource.originalName ? (
              <p className='truncate text-xs text-muted-foreground' title={resource.originalName}>
                File: {resource.originalName}
              </p>
            ) : null}
            {resource.description ? (
              <p className='line-clamp-2 text-sm text-muted-foreground'>{resource.description}</p>
            ) : null}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2 sm:justify-end sm:pt-0.5'>
          {canPreview ? (
            <Button
              variant='outline'
              size='sm'
              className='h-9 gap-1.5 rounded-full border-border bg-card px-3.5 font-medium'
              onClick={() => setPreviewOpen(true)}
              aria-label={`Preview ${resource.title}`}
            >
              <Eye className='size-4' />
              Preview
            </Button>
          ) : null}
          <a
            href={downloadHref}
            {...(isUploaded
              ? { download: resource.originalName ?? true }
              : { target: '_blank', rel: 'noreferrer' })}
            className='inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 text-sm font-medium text-primary hover:bg-primary/10'
            aria-label={`${openLabel} ${resource.title}`}
          >
            <OpenIcon className='size-4' />
            {openLabel}
          </a>
          {!isStudent && onEdit ? (
            <Button
              variant='outline'
              size='sm'
              className='h-9 gap-1.5 rounded-full border-border bg-card px-3.5 font-medium'
              onClick={() => onEdit(resource)}
              aria-label={`Edit ${resource.title}`}
            >
              <Edit className='size-4' />
              Edit
            </Button>
          ) : null}
          {!isStudent && onDelete ? (
            <Button
              variant='outline'
              size='sm'
              className='h-9 gap-1.5 rounded-full border-destructive/30 bg-card px-3.5 font-medium text-destructive hover:bg-destructive/5'
              onClick={() => onDelete(resource.id)}
              aria-label={`Delete ${resource.title}`}
            >
              <Trash2 className='size-4' />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      {canPreview ? (
        <ResourcePdfDialog
          resource={resource}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      ) : null}
    </article>
  );
}
