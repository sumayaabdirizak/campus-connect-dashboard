'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/features/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/features/ui/components/dropdown-menu';
import { Input } from '@/features/ui/components/input';
import { Icons } from '@/components/icons';
import type { DiscussionOverwriteTarget } from '@/lib/discussions/queries';

interface AddTargetMenuProps {
  kind: DiscussionOverwriteTarget;
  options: Array<{ id: number; label: string; subtitle?: string | null }>;
  onPick: (id: number) => void;
}

export function AddTargetMenu({ kind, options, onPick }: AddTargetMenuProps) {
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
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQuery('');
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='gap-1.5'>
          <Icons.add className='h-3.5 w-3.5' />
          Add {kind === 'ROLE' ? 'role' : 'member'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-72'>
        <DropdownMenuLabel className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          {kind === 'ROLE' ? 'Server roles' : 'Server members'}
        </DropdownMenuLabel>
        <div className='px-2 pb-2'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${kind === 'ROLE' ? 'roles' : 'members'}…`}
            className='h-7 text-xs'
          />
        </div>
        <DropdownMenuSeparator />
        <div className='max-h-64 overflow-y-auto'>
          {filtered.length === 0 ? (
            <div className='px-3 py-4 text-center text-xs text-muted-foreground'>
              {options.length === 0 ? 'Everything is already overridden.' : 'No matches.'}
            </div>
          ) : (
            filtered.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onSelect={() => onPick(o.id)}
                className='flex flex-col items-start gap-0.5'
              >
                <span className='text-sm leading-none'>{o.label}</span>
                {o.subtitle ? (
                  <span className='text-[11px] text-muted-foreground'>{o.subtitle}</span>
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
