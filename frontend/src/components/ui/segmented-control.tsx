'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * SegmentedControl — single primitive replacing the 5+ hand-rolled
 * `<div className='inline-flex rounded-* border bg-card p-0.5'>` segmented
 * buttons that appeared across `course-quizzes.tsx`, `course-assignments.tsx`,
 * and `announcement-feed.tsx` (see UI_AUDIT.md §3).
 *
 * Why a new primitive instead of shadcn `Tabs` or `ToggleGroup`:
 *   - These segmented controls are used for FILTERING data lists, not for
 *     swapping which surface the user sees. They don't need the tablist /
 *     panel semantics of `Tabs`.
 *   - `ToggleGroup` is closer but its single-select API forces an explicit
 *     `type='single'` plus value-can-be-undefined plumbing every time.
 *   - This primitive's "value-must-be-set, callback-on-change" API matches
 *     the existing call patterns 1:1, so each migration is mechanical.
 *
 * Geometry is locked: `rounded-md` outer + `rounded-md` inner buttons, no
 * arbitrary pixel sizes, no className overrides — the whole point is that
 * five inconsistent implementations become one consistent one.
 *
 * Counts in option labels (e.g. "Submitted (12)") are passed via `count`
 * rather than baked into the label, so we can render them with the right
 * `tabular-nums` font and parens automatically.
 */
export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /// Optional numeric tally rendered to the right of the label, e.g. "All (24)".
  count?: number;
  /// Optional disabled state — useful when a filter has no matching items
  /// AND the empty state is undesirable.
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  /// The currently-selected option's `value`. Controlled — no internal state.
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<SegmentedControlOption<T>>;
  /// Accessible label for the group. Required because this is a navigation
  /// affordance — screen readers need to know what the buttons filter.
  ariaLabel: string;
  /// Optional size knob. `sm` (default) matches the existing filter pills;
  /// `md` is for higher-emphasis surfaces like the analytics tabs.
  size?: 'sm' | 'md';
  /// Mostly here for the rare case (announcement-feed) where the design
  /// asks for the row to span the full container width. Default `auto`
  /// keeps the control sized to its content.
  width?: 'auto' | 'full';
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'sm',
  width = 'auto',
  className
}: SegmentedControlProps<T>) {
  return (
    <div
      role='radiogroup'
      aria-label={ariaLabel}
      className={cn(
        'inline-flex rounded-md border bg-card p-0.5 text-xs',
        width === 'full' && 'flex w-full',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type='button'
            role='radio'
            aria-checked={isActive}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              width === 'full' && 'flex-1',
              size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2 text-sm',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={cn(
                  'tabular-nums',
                  isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70'
                )}
              >
                ({opt.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
