'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home, Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';

type Props = {
  /** Current page label, e.g. "Units" / "Batches". */
  title: string;
  parentLabel?: string;
  parentHref?: string;
  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  showFullscreen?: boolean;
  children?: ReactNode;
  className?: string;
};

/** DreamsPOS Units page header: breadcrumb + circular tools + Add New. */
export function PosPageHeader({
  title,
  parentLabel = 'Dashboard',
  parentHref = '/dashboard',
  onAdd,
  addLabel = 'Add New',
  onRefresh,
  refreshing = false,
  showFullscreen = true,
  children,
  className
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Browser may block fullscreen without user gesture / permissions.
    }
  }, []);

  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        className
      )}
    >
      <nav className='flex min-w-0 items-center gap-2 text-sm' aria-label='Breadcrumb'>
        <Link
          href={parentHref}
          className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80'
          aria-label={parentLabel}
        >
          <Home className='size-4' />
        </Link>
        <div className='text-muted-foreground flex min-w-0 items-center gap-1.5'>
          <Link
            href={parentHref}
            className='hover:text-foreground hidden truncate transition-colors sm:inline'
          >
            {parentLabel}
          </Link>
          <span className='hidden sm:inline' aria-hidden>
            ›
          </span>
          <span className='text-foreground truncate font-medium'>{title}</span>
        </div>
      </nav>

      <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
        {onRefresh ? (
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-9 rounded-full bg-card'
            onClick={onRefresh}
            disabled={refreshing}
            aria-label='Refresh'
          >
            <Icons.refresh className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        ) : null}

        {showFullscreen ? (
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='hidden size-9 rounded-full bg-card sm:inline-flex'
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className='size-4' />
            ) : (
              <Maximize2 className='size-4' />
            )}
          </Button>
        ) : null}

        {children}

        {onAdd ? (
          <Button
            type='button'
            className='h-9 flex-1 gap-1.5 rounded-full px-4 text-primary-foreground hover:bg-primary/90 sm:flex-none'
            style={{ backgroundColor: 'var(--primary)' }}
            onClick={onAdd}
          >
            <Icons.add className='size-4' />
            {addLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
