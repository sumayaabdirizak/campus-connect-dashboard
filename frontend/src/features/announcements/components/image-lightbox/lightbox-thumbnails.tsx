'use client';

import Image from 'next/image';

interface LightboxThumbnailsProps {
  images: string[];
  alts?: (string | null | undefined)[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function LightboxThumbnails({
  images,
  alts,
  currentIndex,
  onSelect
}: LightboxThumbnailsProps) {
  if (images.length <= 1) return null;

  return (
    <div
      role='tablist'
      aria-label='Gallery thumbnails'
      className='fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 max-w-[80vw] overflow-x-auto p-2 bg-black/60 rounded-xl'
    >
      {images.map((img, idx) => {
        const thumbAlt =
          (alts && alts[idx] && String(alts[idx]).trim()) || `Thumbnail ${idx + 1}`;
        const isActive = idx === currentIndex;
        return (
          <button
            key={idx}
            role='tab'
            type='button'
            aria-selected={isActive}
            aria-label={thumbAlt}
            tabIndex={isActive ? 0 : -1}
            className={`relative h-16 w-16 min-h-[44px] min-w-[44px] flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all focus-visible:ring-2 focus-visible:ring-white ${
              isActive ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(idx);
            }}
          >
            <Image
              src={img}
              alt=''
              fill
              className='object-cover'
              unoptimized={img.includes('localhost') || img.includes('127.0.0.1')}
            />
          </button>
        );
      })}
    </div>
  );
}
