'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface ImageLightboxProps {
  images: string[];
  /** Optional alt text per image, parallel to `images`. Falls back to a generic label. */
  alts?: (string | null | undefined)[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

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
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const isRtl = typeof document !== 'undefined' && document.documentElement?.dir === 'rtl';

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!open) return;
    // Save the trigger so we can restore focus on close (WCAG 2.4.3 Focus Order).
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    // Move focus into the dialog on open.
    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      // RTL mirrors arrow direction so ←/→ continue to mean "previous"/"next" visually.
      if (e.key === 'ArrowLeft') {
        if (isRtl) goToNext();
        else goToPrevious();
        return;
      }
      if (e.key === 'ArrowRight') {
        if (isRtl) goToPrevious();
        else goToNext();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        // Simple focus trap — keeps Tab cycling inside the lightbox.
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, goToPrevious, goToNext, isRtl]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!open || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const currentAlt =
    (alts && alts[currentIndex] && String(alts[currentIndex]).trim()) ||
    `Attachment ${currentIndex + 1} of ${images.length}`;

  return (
    <div
      ref={dialogRef}
      role='dialog'
      aria-modal='true'
      aria-label={currentAlt}
    >
      {/* Backdrop — hidden from AT; pointer-only close target */}
      <div
        aria-hidden
        className='fixed inset-0 z-50 bg-black/90 backdrop-blur-sm'
        onClick={() => onOpenChange(false)}
      />

      {/* Close Button (initial focus target) */}
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

      {/* Previous Button */}
      {images.length > 1 && (
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
      )}

      {/* Next Button */}
      {images.length > 1 && (
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
      )}

      {/* Image Container */}
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

      {/* Thumbnails Strip */}
      {images.length > 1 && (
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
                  isActive
                    ? 'border-white'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
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
      )}
    </div>
  );
}
