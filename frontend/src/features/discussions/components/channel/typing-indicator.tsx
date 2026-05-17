'use client';

import { cn } from '@/lib/utils';

function formatTypers(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  if (names.length === 3) {
    return `${names[0]}, ${names[1]} and ${names[2]} are typing…`;
  }
  return 'Several people are typing…';
}

/** Tiny dot animation — three pulsing dots. */
function TypingDots() {
  return (
    <span className='inline-flex items-end gap-0.5' aria-hidden>
      <span className='h-1 w-1 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-current opacity-70 [animation-delay:0ms]' />
      <span className='h-1 w-1 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-current opacity-70 [animation-delay:200ms]' />
      <span className='h-1 w-1 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-current opacity-70 [animation-delay:400ms]' />
    </span>
  );
}

export function TypingIndicator({ typers }: { typers: string[] }) {
  // Reserve the slot height to avoid layout jumps when typers appear/vanish.
  return (
    <div
      aria-live='polite'
      aria-atomic='true'
      className={cn(
        'flex h-5 items-center gap-1.5 px-6 text-[11px] text-muted-foreground transition-opacity',
        typers.length === 0 ? 'opacity-0' : 'opacity-100'
      )}
    >
      {typers.length > 0 && (
        <>
          <TypingDots />
          <span className='truncate'>{formatTypers(typers)}</span>
        </>
      )}
    </div>
  );
}
