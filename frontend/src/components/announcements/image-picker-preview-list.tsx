'use client';

import Image from 'next/image';
import { Icons } from '@/components/icons';
import type { ImageFile } from './image-picker-utils';

export function ImagePickerPreviewList({
  images,
  maxImages,
  onImagesChange,
  onRemove,
}: {
  images: ImageFile[];
  maxImages: number;
  onImagesChange: (images: ImageFile[]) => void;
  onRemove: (id: string) => void;
}) {
  if (images.length === 0) return null;

  return (
    <>
      <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {images.map((img, idx) => (
          <li
            key={img.id}
            className='flex items-start gap-3 rounded-lg border border-border bg-background p-2'
          >
            <div className='relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted'>
              <Image
                src={img.preview}
                alt={img.altText || `Image ${idx + 1} preview`}
                fill
                unoptimized
                className='object-cover'
              />
            </div>
            <div className='min-w-0 flex-1 space-y-1.5'>
              <label htmlFor={`announcement-alt-${img.id}`} className='block text-xs font-medium text-foreground'>
                Alt text
                <span className='ms-1 text-muted-foreground'>(describe the image)</span>
              </label>
              <input
                id={`announcement-alt-${img.id}`}
                type='text'
                maxLength={150}
                value={img.altText ?? ''}
                onChange={(e) =>
                  onImagesChange(
                    images.map((existing) =>
                      existing.id === img.id ? { ...existing, altText: e.target.value } : existing
                    )
                  )
                }
                aria-describedby={`announcement-alt-help-${img.id}`}
                placeholder='e.g. Faculty hall with students seated for orientation'
                className='block w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              />
              <p id={`announcement-alt-help-${img.id}`} className='text-[11px] text-muted-foreground'>
                Required for screen-reader users. Leave empty only if the image is purely decorative.
              </p>
            </div>
            <button
              type='button'
              aria-label={`Remove image ${idx + 1}`}
              className='flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              onClick={(e) => {
                e.stopPropagation();
                onRemove(img.id);
              }}
            >
              <Icons.close className='size-4' aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {images.length < maxImages && (
        <p className='text-xs text-muted-foreground'>
          {images.length} of {maxImages} images added
        </p>
      )}
    </>
  );
}
