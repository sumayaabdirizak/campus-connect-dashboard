'use client';

import { cn } from '@/lib/utils';
import type { PresenceState } from '../../api/types';

const COLOURS: Record<PresenceState, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  dnd: 'bg-red-500',
  offline: 'bg-zinc-400 dark:bg-zinc-600'
};

const LABELS: Record<PresenceState, string> = {
  online: 'Online',
  away: 'Away',
  dnd: 'Do not disturb',
  offline: 'Offline'
};

/**
 * Small status dot rendered as an absolute overlay on top of an Avatar.
 * Parent should be `relative` and the dot will pin to bottom-right.
 *
 * Use the `inline` variant when you want a standalone dot in a row of text.
 */
export function PresenceDot({
  state,
  inline = false,
  className
}: {
  state: PresenceState;
  inline?: boolean;
  className?: string;
}) {
  return (
    <span
      role='img'
      aria-label={LABELS[state]}
      title={LABELS[state]}
      className={cn(
        'block rounded-full ring-2 ring-background',
        COLOURS[state],
        inline ? 'h-2 w-2 ring-0' : 'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5',
        className
      )}
    />
  );
}
