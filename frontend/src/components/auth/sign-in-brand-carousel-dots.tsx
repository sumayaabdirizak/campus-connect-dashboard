'use client';

import { cn } from '@/lib/utils';
import {
  SIGN_IN_BRAND_SLIDES,
  SIGN_IN_BRAND_SLIDE_MS
} from './sign-in-brand-slides';

type Props = {
  index: number;
  progressKey: number;
  paused: boolean;
  onSelect: (i: number) => void;
};

export function SignInBrandCarouselDots({
  index,
  progressKey,
  paused,
  onSelect
}: Props) {
  return (
    <div className='flex items-center gap-2.5' role='tablist' aria-label='Highlights'>
      {SIGN_IN_BRAND_SLIDES.map((slide, i) => {
        const active = i === index;
        return (
          <button
            key={slide.src}
            type='button'
            role='tab'
            aria-selected={active}
            aria-label={slide.alt}
            onClick={() => onSelect(i)}
            className={cn(
              'relative h-2 overflow-hidden rounded-full transition-[width,background-color] duration-300',
              active ? 'w-9 bg-sky-200/80' : 'w-2 bg-sky-300/55 hover:bg-sky-400/70'
            )}
          >
            {active ? (
              <span
                key={progressKey}
                className='absolute inset-y-0 start-0 origin-left w-full rounded-full bg-sky-500'
                style={{
                  animation: `cc-carousel-progress ${SIGN_IN_BRAND_SLIDE_MS}ms linear forwards`,
                  animationPlayState: paused ? 'paused' : 'running'
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
