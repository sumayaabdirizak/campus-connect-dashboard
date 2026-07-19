import { type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Optional leading icon (lucide). */
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional call-to-action (e.g. a Button or link). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shared empty-state primitive for "no results / nothing here yet" surfaces.
 *
 * Pastel-illustrated: layered soft blobs behind the icon give every blank
 * screen a designed, friendly moment instead of a lone grey glyph (the
 * "pastel empty states" direction from the page-inspiration round). Same
 * props as before, so every existing call site upgrades automatically.
 * Token/dark-mode safe; entrance animation respects reduced motion.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role='status'
      aria-live='polite'
      className={cn(
        'animate-fade-up flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 p-10 text-center',
        className
      )}
    >
      {/* Illustration: layered pastel blobs + the feature icon in a floating
          chip. Pure CSS shapes — no image assets, themes/dark handled via
          Tailwind dark variants. */}
      <div aria-hidden='true' className='relative mb-2 h-20 w-24'>
        <span className='absolute top-3 left-2 size-14 rounded-[50%_42%_55%_45%] bg-violet-200/80 dark:bg-violet-500/25' />
        <span className='absolute top-0 right-1 size-9 rounded-[45%_55%_40%_60%] bg-pink-200/80 dark:bg-pink-500/25' />
        <span className='absolute right-4 bottom-1 size-5 rounded-full bg-emerald-200/90 dark:bg-emerald-500/30' />
        <span className='absolute bottom-3 left-0 size-3 rounded-full bg-amber-200/90 dark:bg-amber-500/30' />
        {Icon && (
          <span className='absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-card shadow-md ring-1 ring-border/60'>
            <Icon className='size-5 text-violet-500 dark:text-violet-300' />
          </span>
        )}
      </div>

      <h3 className='text-foreground text-base font-semibold tracking-tight'>{title}</h3>
      {description && (
        <p className='text-muted-foreground max-w-sm text-sm text-balance'>{description}</p>
      )}
      {action && <div className='mt-2'>{action}</div>}
    </div>
  );
}
