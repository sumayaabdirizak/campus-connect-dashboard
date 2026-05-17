'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  useCreateGroupDm,
  useGroupDmCandidates
} from '../../api/queries';
import type { GroupDmCandidate } from '../../api/types';

const MIN_OTHER_MEMBERS = 2; // backend requires ≥3 total incl. caller
const MAX_OTHER_MEMBERS = 9; // backend caps at 10 total incl. caller

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function DmCreateDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<GroupDmCandidate[]>([]);
  const [name, setName] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // Move keyboard focus to the search input when the dialog opens.
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const { data, isLoading } = useGroupDmCandidates(debouncedSearch);
  const create = useCreateGroupDm();

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(t);
  }, [search]);

  // Reset everything when the dialog closes.
  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      setSelected([]);
      setName('');
    }
  }, [open]);

  const candidates = data?.results ?? [];
  const selectedIds = useMemo(() => new Set(selected.map((c) => c.id)), [selected]);

  const toggle = (c: GroupDmCandidate) => {
    if (selectedIds.has(c.id)) {
      setSelected((prev) => prev.filter((x) => x.id !== c.id));
      return;
    }
    if (selected.length >= MAX_OTHER_MEMBERS) return;
    setSelected((prev) => [...prev, c]);
  };

  const handleCreate = () => {
    if (selected.length < MIN_OTHER_MEMBERS || create.isPending) return;
    create.mutate(
      {
        name: name.trim() || null,
        memberUserIds: selected.map((c) => c.id)
      },
      {
        onSuccess: (res) => {
          onOpenChange(false);
          const id = (res as { groupDm?: { id?: number } })?.groupDm?.id;
          if (id) router.push(`/dashboard/chat/dm/${id}`);
        }
      }
    );
  };

  const tooFew = selected.length < MIN_OTHER_MEMBERS;
  const atMax = selected.length >= MAX_OTHER_MEMBERS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New direct message</DialogTitle>
          <DialogDescription>
            Pick {MIN_OTHER_MEMBERS}–{MAX_OTHER_MEMBERS} people from your workspaces.
            You’ll be the {MIN_OTHER_MEMBERS + 1 - MIN_OTHER_MEMBERS}
            <span className='sr-only'> additional</span> member.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <Input
            placeholder='Optional group name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
          />

          {selected.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {selected.map((c) => (
                <span
                  key={c.id}
                  className='inline-flex items-center gap-1 rounded-full border bg-muted/60 py-0.5 pl-2 pr-1 text-xs'
                >
                  {c.full_name}
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-5 w-5'
                    aria-label={`Remove ${c.full_name}`}
                    onClick={() => toggle(c)}
                  >
                    <Icons.close className='h-3 w-3' />
                  </Button>
                </span>
              ))}
            </div>
          )}

          <div className='relative'>
            <Icons.search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              ref={searchRef}
              placeholder='Search people…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-7'
            />
          </div>

          <ScrollArea className='h-60 rounded-md border'>
            {isLoading && candidates.length === 0 ? (
              <div className='flex items-center justify-center gap-1 py-8 text-xs text-muted-foreground'>
                <Icons.spinner className='h-3 w-3 animate-spin' />
                Loading…
              </div>
            ) : candidates.length === 0 ? (
              <div className='py-8 text-center text-xs text-muted-foreground'>
                {debouncedSearch ? 'No matches' : 'Type to search'}
              </div>
            ) : (
              <ul className='divide-y'>
                {candidates.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type='button'
                        onClick={() => toggle(c)}
                        disabled={!isSelected && atMax}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <Avatar className='h-7 w-7 shrink-0'>
                          <AvatarFallback className='text-[10px]'>
                            {initialsFor(c.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                          <div className='truncate text-xs font-medium'>{c.full_name}</div>
                          {c.email && (
                            <div className='truncate text-[11px] text-muted-foreground'>
                              {c.email}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <Icons.check className='h-4 w-4 text-primary' />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          {atMax && (
            <p className='text-[11px] text-muted-foreground'>
              You’ve hit the {MAX_OTHER_MEMBERS}-person limit. Remove someone to add another.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={tooFew || create.isPending}
          >
            {create.isPending ? (
              <Icons.spinner className='h-4 w-4 animate-spin' />
            ) : (
              <>
                Create
                {selected.length > 0 && ` (${selected.length + 1})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
