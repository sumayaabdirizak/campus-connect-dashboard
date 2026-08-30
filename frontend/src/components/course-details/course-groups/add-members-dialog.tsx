'use client';

import { useMemo, useState } from 'react';
import { Check, Search, UserPlus } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { Checkbox } from '@/features/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/features/ui/components/dialog';
import { Input } from '@/features/ui/components/input';
import { cn } from '@/lib/utils';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function AddMembersDialog({
  open,
  onOpenChange,
  groupName,
  candidates,
  onConfirm,
  confirming
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  candidates: RosterStudent[];
  onConfirm: (studentIds: number[]) => void;
  confirming: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter(
      (s) =>
        s.full_name.toLowerCase().includes(needle) ||
        (s.number ?? '').toLowerCase().includes(needle) ||
        (s.email ?? '').toLowerCase().includes(needle)
    );
  }, [candidates, search]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const s of filtered) next.delete(s.id);
      } else {
        for (const s of filtered) next.add(s.id);
      }
      return next;
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch('');
      setSelected(new Set());
    }
    onOpenChange(next);
  };

  const count = selected.size;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md'>
        <DialogHeader className='shrink-0 space-y-1 border-b border-border px-5 pt-5 pb-4 pr-12 text-left'>
          <DialogTitle className='text-lg font-semibold text-foreground'>
            Add students
          </DialogTitle>
          <DialogDescription className='text-sm text-muted-foreground'>
            Select one or more students for{' '}
            <span className='font-semibold text-foreground'>{groupName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 px-5 py-3'>
          <div className='relative'>
            <Search
              className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search by name or ID…'
              className='h-10 border-2 border-border pl-9 text-sm'
              autoFocus
            />
          </div>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm font-semibold text-foreground'>
              {filtered.length} available
              {count > 0 ? ` · ${count} selected` : ''}
            </p>
            {filtered.length > 0 ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 border-border text-xs font-semibold'
                onClick={toggleAllVisible}
              >
                {allVisibleSelected ? 'Clear all' : 'Select all'}
              </Button>
            ) : null}
          </div>
        </div>

        <div className='min-h-0 flex-1 overflow-y-auto border-t border-b border-border bg-muted/60 px-2 py-1'>
          {candidates.length === 0 ? (
            <p className='px-3 py-8 text-center text-sm font-medium text-muted-foreground'>
              Every student is already in a group.
            </p>
          ) : filtered.length === 0 ? (
            <p className='px-3 py-8 text-center text-sm font-medium text-muted-foreground'>
              No students match your search.
            </p>
          ) : (
            <ul className='space-y-1 py-1'>
              {filtered.map((s) => {
                const checked = selected.has(s.id);
                const rowId = `add-member-${s.id}`;
                return (
                  <li key={s.id}>
                    <label
                      htmlFor={rowId}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                        checked
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-transparent bg-card hover:border-border hover:bg-card'
                      )}
                    >
                      <Checkbox
                        id={rowId}
                        checked={checked}
                        onCheckedChange={() => toggle(s.id)}
                        aria-label={`Select ${s.full_name}`}
                      />
                      <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary'>
                        {initials(s.full_name)}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-semibold text-foreground'>
                          {s.full_name}
                        </p>
                        {s.number ? (
                          <p className='truncate text-xs text-muted-foreground'>{s.number}</p>
                        ) : null}
                      </div>
                      {checked ? (
                        <Check className='size-4 shrink-0 text-primary' aria-hidden />
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className='shrink-0 gap-2 border-t border-border px-5 py-4 sm:gap-2'>
          <Button
            type='button'
            variant='outline'
            className='border-2'
            onClick={() => handleOpenChange(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type='button'
            className='gap-1.5'
            disabled={count === 0 || confirming}
            onClick={() => onConfirm(Array.from(selected))}
          >
            <UserPlus className='size-4' />
            {confirming
              ? 'Adding…'
              : count === 0
                ? 'Add students'
                : `Add ${count} student${count === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
