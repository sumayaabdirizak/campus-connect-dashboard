'use client';

import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useImageLightboxKeyboard(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  goToPrevious: () => void,
  goToNext: () => void,
  dialogRef: React.RefObject<HTMLDivElement | null>,
  closeButtonRef: React.RefObject<HTMLButtonElement | null>
) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const isRtl = typeof document !== 'undefined' && document.documentElement?.dir === 'rtl';

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, closeButtonRef]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
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
  }, [open, onOpenChange, goToPrevious, goToNext, isRtl, dialogRef]);
}
