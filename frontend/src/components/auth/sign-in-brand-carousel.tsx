'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  SIGN_IN_BRAND_FADE_MS,
  SIGN_IN_BRAND_SLIDES
} from './sign-in-brand-slides';
import { SignInBrandCarouselDots } from './sign-in-brand-carousel-dots';
import { useSignInBrandCarousel } from './use-sign-in-brand-carousel';

const FADE_S = SIGN_IN_BRAND_FADE_MS / 1000;

type Props = {
  children?: ReactNode;
};

export function SignInBrandCarousel({ children }: Props) {
  const reduceMotion = useReducedMotion();
  const { index, goTo, paused, setPaused, progressKey } = useSignInBrandCarousel();
  const slide = SIGN_IN_BRAND_SLIDES[index];

  return (
    <div
      className='flex w-full flex-col items-center gap-7'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className='relative aspect-square w-[min(100%,56vh,400px)]'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_70%)] blur-2xl'
        />

        <AnimatePresence mode='wait' initial={false}>
          <motion.div
            key={slide.src}
            className='absolute inset-0'
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 10, filter: 'blur(4px)' }
            }
            animate={
              reduceMotion
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    transition: { duration: FADE_S, ease: [0.22, 1, 0.36, 1] }
                  }
            }
            exit={
              reduceMotion
                ? { opacity: 0 }
                : {
                    opacity: 0,
                    scale: 1.03,
                    y: -6,
                    filter: 'blur(3px)',
                    transition: { duration: FADE_S * 0.55, ease: [0.4, 0, 1, 1] }
                  }
            }
          >
            <motion.div
              className='relative size-full'
              animate={
                reduceMotion || paused ? { y: 0 } : { y: [0, -4, 0] }
              }
              transition={
                reduceMotion || paused
                  ? { duration: 0 }
                  : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority
                sizes='400px'
                className='bg-transparent object-contain drop-shadow-[0_12px_28px_rgba(14,165,233,0.12)]'
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {children}

      <SignInBrandCarouselDots
        index={index}
        progressKey={progressKey}
        paused={paused}
        onSelect={goTo}
      />
    </div>
  );
}
