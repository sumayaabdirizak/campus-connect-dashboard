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
        className={`mt-2.5 grid w-full min-w-0 gap-1.5 overflow-hidden rounded-lg ${
          single ? 'grid-cols-1 justify-items-center' : 'grid-cols-2'
        }`}
      >
        {items.slice(0, 4).map((item, idx) => (
          <button
            key={`${item.url}-${idx}`}
            type='button'
            aria-label={item.alt || `Open image ${idx + 1} of ${items.length}`}
            className={`block min-w-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              single
                ? 'w-full rounded-lg text-center'
                : 'relative aspect-square w-full rounded-lg bg-muted/80'
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
              className={
                single
                  ? 'inline-block h-auto max-h-[32rem] w-auto max-w-full rounded-lg'
                  : 'absolute inset-0 h-full w-full object-cover'
              }
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
