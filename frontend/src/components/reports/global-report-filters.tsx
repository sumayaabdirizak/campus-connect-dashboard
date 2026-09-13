'use client';

import type { ReactNode } from 'react';
import { RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/notifications';

/** High-contrast select/input chrome shared by every report Global filters panel. */
export const GLOBAL_FILTER_CONTROL =
  'h-10 border-2 border-foreground/20 bg-background text-sm font-medium text-foreground shadow-sm hover:border-foreground/35 focus:border-primary focus:ring-2 focus:ring-primary/20';

export const GLOBAL_FILTER_LABEL =
  'text-[11px] font-semibold uppercase tracking-wide text-foreground/70';

type GlobalReportFiltersProps = {
  children: ReactNode;
  onApply: () => void;
  onReset: () => void;
  /** localStorage key — enables Load template */
  storageKey?: string;
  /** Called after a saved template is loaded successfully */
  onLoadTemplate?: (raw: unknown) => void;
  sticky?: boolean;
  className?: string;
  applyLabel?: string;
  applyDisabled?: boolean;
  description?: string;
};

export function GlobalReportFilters({
  children,
  onApply,
  onReset,
  storageKey,
  onLoadTemplate,
  sticky,
  className,
  applyLabel = 'Apply filters',
  applyDisabled,
  description
}: GlobalReportFiltersProps) {
  const handleLoadTemplate = () => {
    if (!storageKey || !onLoadTemplate) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        showToast('error', 'No saved filter template');
        return;
      }
      onLoadTemplate(JSON.parse(raw));
      showToast('success', 'Filter template loaded');
    } catch {
      showToast('error', 'Could not load filter template');
    }
  };

  return (
    <section
      aria-label='Global filters'
      className={cn(
        'rounded-xl border-2 border-foreground/15 bg-muted/80 p-4 shadow-sm',
        'dark:border-border dark:bg-muted/40',
        sticky && 'sticky top-0 z-20 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/90',
        className
      )}
    >
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary'>
            <SlidersHorizontal className='size-4' aria-hidden />
          </span>
          <div>
            <p className='text-sm font-semibold text-foreground'>Global filters</p>
            {description ? (
              <p className='text-xs text-muted-foreground'>{description}</p>
            ) : null}
          </div>
        </div>
        {storageKey && onLoadTemplate ? (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 text-xs text-muted-foreground'
            onClick={handleLoadTemplate}
          >
            Load template
          </Button>
        ) : null}
      </div>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>{children}</div>

      <div className='mt-4 flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-3'>
        <Button
          type='button'
          size='sm'
          className='h-9 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90'
          disabled={applyDisabled}
          onClick={onApply}
        >
          {applyLabel}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-9 border-2 border-foreground/20 bg-background font-medium'
          onClick={onReset}
        >
          <RotateCcw className='mr-1.5 size-3.5' aria-hidden />
          Reset
        </Button>
      </div>
    </section>
  );
}

export function GlobalFilterField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className='flex min-w-0 flex-col gap-1.5'>
      <span className={GLOBAL_FILTER_LABEL}>{label}</span>
      {children}
    </label>
  );
}
