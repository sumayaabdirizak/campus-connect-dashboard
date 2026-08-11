'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SIGN_IN_BRAND_SLIDES,
  SIGN_IN_BRAND_SLIDE_MS
} from './sign-in-brand-slides';

export function useSignInBrandCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const remainingMs = useRef(SIGN_IN_BRAND_SLIDE_MS);

  const goTo = useCallback((next: number) => {
    const len = SIGN_IN_BRAND_SLIDES.length;
    setIndex(((next % len) + len) % len);
    remainingMs.current = SIGN_IN_BRAND_SLIDE_MS;
    setProgressKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (paused) return;

    const started = Date.now();
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % SIGN_IN_BRAND_SLIDES.length);
      remainingMs.current = SIGN_IN_BRAND_SLIDE_MS;
      setProgressKey((k) => k + 1);
    }, remainingMs.current);

    return () => {
      window.clearTimeout(id);
      remainingMs.current = Math.max(
        200,
        remainingMs.current - (Date.now() - started)
      );
    };
  }, [paused, progressKey]);

  return { index, goTo, paused, setPaused, progressKey };
}
