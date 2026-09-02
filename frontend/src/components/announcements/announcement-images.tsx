'use client';

import React, { useMemo, useState } from 'react';
import { Announcement } from '@/lib/announcements/types';
import { ImageLightbox } from './image-lightbox';

interface AnnouncementImagesProps {
  announcement: Announcement;
  onLightboxDiagnostic?: () => void;
}

export function AnnouncementImages({
  announcement,
  onLightboxDiagnostic
}: AnnouncementImagesProps) {
  const [open, setOpen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  const items = useMemo(() => {
    const fromAttachments = announcement.attachments
      ?.filter((a) => String(a.fileType).toLowerCase() === 'image')
      .map((a) => ({
        url: a.thumbnailUrl || a.fileUrl,
        alt: a.altText ?? ''
      }));
    if (fromAttachments && fromAttachments.length > 0) return fromAttachments;
    return (announcement.imageUrls ?? []).map((url) => ({ url, alt: '' }));
  }, [announcement.imageUrls, announcement.attachments]);

  if (!items.length) return null;
  const images = items.map((item) => item.url);
  const alts = items.map((item) => item.alt);
  const single = items.length === 1;

  return (
    <>
      <div
        className={`mt-1 grid w-full min-w-0 gap-1 overflow-hidden rounded-md ${
          single ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'
        }`}
      >
        {items.slice(0, 4).map((item, idx) => (
          <button
            key={`${item.url}-${idx}`}
            type='button'
            aria-label={item.alt || `Open image ${idx + 1} of ${items.length}`}
            className={`relative block min-w-0 overflow-hidden bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              single ? 'h-28 w-full max-w-[14rem] rounded-md' : 'aspect-square w-full rounded-md'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onLightboxDiagnostic?.();
              setInitialIndex(idx);
              setOpen(true);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt || ''}
              className={`absolute inset-0 h-full w-full ${single ? 'object-contain' : 'object-cover'}`}
            />
          </button>
        ))}
      </div>
      <ImageLightbox
        images={images}
        alts={alts}
        initialIndex={initialIndex}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
