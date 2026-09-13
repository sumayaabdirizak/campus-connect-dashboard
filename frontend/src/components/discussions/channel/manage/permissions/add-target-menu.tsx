'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/features/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/features/ui/components/popover';
import { Input } from '@/features/ui/components/input';
import { Icons } from '@/components/icons';
import type { DiscussionOverwriteTarget } from '@/lib/discussions/queries';
import { cn } from '@/lib/utils';

interface AddTargetMenuProps {
  kind: DiscussionOverwriteTarget;
  options: Array<{ id: number; label: string; subtitle?: string | null }>;
  onPick: (id: number) => void;
}

export function AddTargetMenu({ kind, options, onPick }: AddTargetMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return options.slice(0, 30);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.subtitle ?? '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [options, query]);

  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='gap-1.5'>
          <Icons.add className='h-3.5 w-3.5' />
          Add {kind === 'ROLE' ? 'role' : 'member'}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='center'
        side='bottom'
        sideOffset={8}
        collisionPadding={16}
        className='z-[120] w-72 p-0'
      >
        <div className='px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {kind === 'ROLE' ? 'Server roles' : 'Server members'}
        </div>
        <div className='px-2 pb-2'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${kind === 'ROLE' ? 'roles' : 'members'}…`}
            className='h-7 text-xs'
          />
        </div>
        <div className='border-t' />
        <div className='max-h-64 overflow-y-auto p-1'>
          {filtered.length === 0 ? (
            <div className='px-3 py-4 text-center text-xs text-muted-foreground'>
              {options.length === 0 ? 'Everything is already overridden.' : 'No matches.'}
            </div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.id}
                type='button'
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left text-sm',
                  'hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none'
                )}
                onClick={() => {
                  onPick(o.id);
                  setOpen(false);
                }}
              >
                <span className='leading-none'>{o.label}</span>
                {o.subtitle ? (
                  <span className='text-[11px] text-muted-foreground'>{o.subtitle}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
