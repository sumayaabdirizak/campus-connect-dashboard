'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { Announcement } from '../api/types';
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

  // Attachments are the source of truth for alt text. Fall back to imageUrls when
  // older payloads have no attachment rows (legacy listings before the migration).
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

  return (
    <>
      <div className='mt-2 grid grid-cols-2 gap-2'>
        {items.slice(0, 4).map((item, idx) => (
          <button
            key={`${item.url}-${idx}`}
            type='button'
            aria-label={item.alt || `Open image ${idx + 1} of ${items.length}`}
            className='relative aspect-video overflow-hidden rounded-xl bg-neutral-100 transition-opacity duration-200 ease-out hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:opacity-90 dark:bg-neutral-900'
            onClick={(e) => {
              e.stopPropagation();
              onLightboxDiagnostic?.();
              setInitialIndex(idx);
              setOpen(true);
            }}
          >
            <Image
              src={item.url}
              alt={item.alt || ''}
              fill
              className='object-cover'
              unoptimized={item.url.includes('localhost') || item.url.includes('127.0.0.1')}
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
