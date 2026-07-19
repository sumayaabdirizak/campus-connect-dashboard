'use client';

import { useKBar } from 'kbar';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

export default function SearchInput() {
  const { query } = useKBar();

  return (
    <div className='w-full max-w-sm'>
      <Button
        variant='outline'
        className='relative h-10 w-full justify-start rounded-lg border-border bg-muted/40 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted/70 md:w-56 md:pr-12 lg:w-72 xl:w-80'
        onClick={query.toggle}
        aria-label='Open global search'
      >
        <Icons.search className='mr-2 size-4' aria-hidden='true' />
        Search Campus Connect
        <kbd className='pointer-events-none absolute top-1/2 right-2 hidden h-6 -translate-y-1/2 items-center gap-1 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium sm:flex'>
          <span>Ctrl</span>K
        </kbd>
      </Button>
    </div>
  );
}
