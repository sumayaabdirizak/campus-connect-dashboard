'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { avatarGradient } from '@/features/discussions/utils/avatar-color';
import { useGroupDmCandidates } from '@/features/discussions/api/queries';
import { useStartDirectDm } from '../api/inbox-queries';

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

/**
 * Pick one person → get-or-create a 1:1 DM → open it. Candidates are people
 * you share a group with (backend member-candidates rule).
 */
export function NewMessageDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const { data, isLoading } = useGroupDmCandidates(q);
  const startDm = useStartDirectDm();
  const candidates = data?.results ?? [];

  const pick = (userId: number) => {
    if (pendingId != null) return;
    setPendingId(userId);
    startDm.mutate(userId, {
      onSuccess: (res) => {
        onOpenChange(false);
        setQ('');
        setPendingId(null);
        router.push(`/dashboard/chat/dm/${res.groupDm.id}`);
      },
      onError: () => setPendingId(null)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Start a private conversation with someone in your groups.</DialogDescription>
        </DialogHeader>

        <div className='relative'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search people…'
            className='h-10 pl-9'
          />
        </div>

        <div className='max-h-72 space-y-0.5 overflow-y-auto'>
          {isLoading && candidates.length === 0 ? (
            <p className='px-2 py-6 text-center text-sm text-muted-foreground'>Searching…</p>
          ) : candidates.length === 0 ? (
            <p className='px-2 py-6 text-center text-sm text-muted-foreground'>
              {q ? 'No people match.' : 'Type a name to search.'}
            </p>
          ) : (
            candidates.map((c) => (
              <button
                key={c.id}
                type='button'
                disabled={pendingId != null}
                onClick={() => pick(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-60'
                )}
              >
                <span
                  className='flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white'
                  style={{ background: avatarGradient(c.full_name) }}
                >
                  {initialsOf(c.full_name)}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium'>{c.full_name}</p>
                  {c.email && <p className='truncate text-xs text-muted-foreground'>{c.email}</p>}
                </div>
                {pendingId === c.id && <Loader2 className='size-4 shrink-0 animate-spin text-muted-foreground' />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
