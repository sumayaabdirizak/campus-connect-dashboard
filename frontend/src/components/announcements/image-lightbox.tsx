'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/features/ui/components/button';
import { Icons } from '@/components/icons';
import { useImageLightboxKeyboard } from './image-lightbox/use-image-lightbox-keyboard';
import { LightboxThumbnails } from './image-lightbox/lightbox-thumbnails';

export interface ImageLightboxProps {
  images: string[];
  alts?: (string | null | undefined)[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({
  images,
  alts,
  initialIndex = 0,
  open,
  onOpenChange
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useImageLightboxKeyboard(open, onOpenChange, goToPrevious, goToNext, dialogRef, closeButtonRef);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const currentAlt =
    (alts && alts[currentIndex] && String(alts[currentIndex]).trim()) ||
    `Attachment ${currentIndex + 1} of ${images.length}`;

  return (
    <div ref={dialogRef} role='dialog' aria-modal='true' aria-label={currentAlt}>
      <div
        aria-hidden
        className='fixed inset-0 z-50 bg-black/90 backdrop-blur-sm'
        onClick={() => onOpenChange(false)}
      />

      <Button
        ref={closeButtonRef}
        variant='ghost'
        size='icon'
        aria-label='Close gallery'
        className='fixed top-4 right-4 z-50 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white focus-visible:ring-2 focus-visible:ring-white'
        onClick={() => onOpenChange(false)}
      >
        <Icons.close className='size-5' aria-hidden />
      </Button>

      {images.length > 1 && (
        <>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Previous image'
            className='fixed left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white focus-visible:ring-2 focus-visible:ring-white'
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
          >
            <Icons.chevronLeft className='size-6' aria-hidden />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            aria-label='Next image'
            className='fixed right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70 text-white focus-visible:ring-2 focus-visible:ring-white'
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <Icons.chevronRight className='size-6' aria-hidden />
          </Button>
        </>
      )}

      <div
        role='presentation'
        className='fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none'
      >
        <div className='relative max-h-full max-w-full pointer-events-auto'>
          <Image
            src={currentImage}
            alt={currentAlt}
            width={1200}
            height={800}
            className='max-h-[85vh] h-auto w-auto rounded-lg object-contain shadow-2xl'
            priority
            unoptimized={currentImage.includes('localhost') || currentImage.includes('127.0.0.1')}
          />

          {images.length > 1 && (
            <div
              aria-live='polite'
              className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full text-sm text-white'
            >
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      <LightboxThumbnails
        images={images}
        alts={alts}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
      />
    </div>
  );
}
