'use client';

import { useKBar } from 'kbar';
import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import { cn } from '@/lib/utils';

export default function SearchInput({
  className,
  variant = 'default'
}: {
  className?: string;
  variant?: 'default' | 'pharmacy';
}) {
  const { query } = useKBar();

  if (variant === 'pharmacy') {
    return (
      <div className={cn('relative', className)}>
        <span className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground'>
          <Icons.search className='size-4' aria-hidden='true' />
        </span>
        <input
          type='text'
          readOnly
          className='h-9 w-full min-w-[200px] cursor-pointer rounded-full border border-border bg-transparent pr-11 pl-9 text-sm text-foreground placeholder:text-muted-foreground'
          placeholder='Search'
          onClick={query.toggle}
          onFocus={query.toggle}
          aria-label='Open global search'
        />
        <span className='pointer-events-none absolute top-1/2 right-1.5 flex h-[26px] w-[38px] -translate-y-1/2 items-center justify-center rounded-[34px] bg-muted text-[11px] text-foreground'>
          ⌘K
        </span>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-sm', className)}>
      <Button
        variant='outline'
        className='relative h-9 w-full justify-start rounded-full border-0 bg-muted/70 px-3 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted'
        onClick={query.toggle}
        aria-label='Open global search'
      >
        <Icons.search className='mr-2 size-4 shrink-0' aria-hidden='true' />
        <span className='truncate'>Search</span>
        <kbd className='pointer-events-none absolute top-1/2 right-2 hidden h-5 -translate-y-1/2 items-center rounded border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex'>
          ⌘K
        </kbd>
      </Button>
    </div>
  );
}
