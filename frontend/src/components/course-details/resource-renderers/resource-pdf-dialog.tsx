'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resourceDownloadUrl } from '@/lib/course-details/services/resources-service';
import type { Resource } from '@/lib/course-details/types';
import { PdfViewer } from '../_shared/pdf-viewer-lazy';
import { isPdfUrl } from '../_shared/is-pdf-url';

/// True when the resource is a PDF we can render in-app. Uploads are judged
/// by the stored mime type; pasted links only have a URL to go on.
export function isPdfResource(resource: Resource): boolean {
  if (resource.mimeType?.toLowerCase().includes('pdf')) return true;
  return isPdfUrl(resource.url);
}

/// The URL to hand the viewer. Uploaded files go through the same-origin
/// `/api/download/:id` path (cookies ride along, no CORS); pasted links use
/// their own URL, which `PdfViewer`'s proxy fetches server-side.
export function resourcePdfUrl(resource: Resource): string {
  return resource.originalName ? resourceDownloadUrl(resource.id) : resource.url;
}

/// Full-screen reader rather than a dialog: course PDFs run to dozens of
/// pages, and a centred modal capped at 70vh left roughly a third of the
/// page visible at a time.
export function ResourcePdfDialog({
  resource,
  open,
  onOpenChange
}: {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  if (!open || !resource) return null;

  const downloadHref = resource.originalName
    ? resourceDownloadUrl(resource.id, { forceDownload: true })
    : resource.url;

  return createPortal(
    <div
      className='fixed inset-0 z-[100] flex flex-col bg-background'
      role='dialog'
      aria-modal='true'
      aria-label={resource.title}
    >
      <header className='flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3'>
        <div className='min-w-0'>
          <h2 className='truncate text-base font-semibold'>{resource.title}</h2>
          {resource.originalName ? (
            <p className='truncate text-xs text-muted-foreground'>{resource.originalName}</p>
          ) : null}
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button asChild variant='outline' size='sm' className='gap-1.5'>
            <a
              href={downloadHref}
              {...(resource.originalName
                ? { download: resource.originalName }
                : { target: '_blank', rel: 'noreferrer' })}
            >
              <Download className='size-4' />
              <span className='hidden sm:inline'>Download</span>
            </a>
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => onOpenChange(false)}
            aria-label='Close preview'
          >
            <X className='size-5' />
          </Button>
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col p-4'>
        <PdfViewer url={resourcePdfUrl(resource)} fillHeight />
      </div>
    </div>,
    document.body
  );
}
