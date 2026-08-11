'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/features/ui/components/dialog';
import { Input } from '@/features/ui/components/input';
import { useAuthStore } from '@/lib/auth-store';
import { useGroupDmCandidates } from '@/lib/discussions/queries';
import { canDirectMessage, isOfficeStaffRole } from '@shared/roles';
import { useStartDirectDm } from '@/lib/inbox/queries';
import { newMessageCopyForRole } from './new-message-copy';
import { NewMessageBrowse } from './new-message-browse';
import { NewMessagePersonRow } from './new-message-person-row';
import {
  matchesNewMessageRoleChip,
  NewMessageRoleChips,
  type NewMessageRoleChip
} from './new-message-role-chips';

/**
 * Pick one person → get-or-create a 1:1 DM → open it.
 * Browse by department → batch → section, or search by name.
 */
export function NewMessageDialog({
  open,
  onOpenChange,
  onOpened
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpened?: (href: string) => void;
}) {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const canDirectDm = canDirectMessage(role);
  const [q, setQ] = useState('');
  const [roleChip, setRoleChip] = useState<NewMessageRoleChip>('ALL');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const { data, isLoading } = useGroupDmCandidates(q, 'direct', open && canDirectDm);
  const copy = newMessageCopyForRole(
    role,
    isOfficeStaffRole(role) ? (data?.dmScope ?? null) : null
  );
  const startDm = useStartDirectDm();
  const raw = data?.results ?? [];
  const candidates = copy.showRoleChips
    ? raw.filter((c) => matchesNewMessageRoleChip(c.role, roleChip))
    : raw;
  const isSearching = q.trim().length > 0;
  const useBrowse = Boolean(copy.showRoleChips) && !isSearching;

  const pick = (userId: number) => {
    if (pendingId != null) return;
    setPendingId(userId);
    startDm.mutate(userId, {
      onSuccess: (res) => {
        onOpenChange(false);
        setQ('');
        setRoleChip('ALL');
        setPendingId(null);
        const href = `/dashboard/messages?dm=${res.groupDm.id}`;
        if (onOpened) onOpened(href);
        else router.push(href);
      },
      onError: () => setPendingId(null)
    });
  };

  const reset = () => {
    setQ('');
    setRoleChip('ALL');
    setPendingId(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className='gap-4 sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {copy.showRoleChips ? (
          <NewMessageRoleChips
            value={roleChip}
            onChange={setRoleChip}
            variant={copy.showRoleChips}
          />
        ) : null}

        <div className='relative'>
          <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              useBrowse || copy.showRoleChips
                ? 'Or search by name…'
                : copy.placeholder
            }
            className='h-10 pl-9'
          />
        </div>

        {useBrowse ? (
          <NewMessageBrowse
            key={roleChip}
            candidates={candidates}
            isLoading={isLoading}
            pendingId={pendingId}
            onPick={pick}
          />
        ) : (
          <div className='max-h-72 space-y-0.5 overflow-y-auto'>
            {isLoading && candidates.length === 0 ? (
              <p className='px-2 py-6 text-center text-sm text-muted-foreground'>
                Loading…
              </p>
            ) : candidates.length === 0 ? (
              <p className='px-2 py-6 text-center text-sm text-muted-foreground'>
                {q ? copy.emptySearch : copy.emptyIdle}
              </p>
            ) : (
              candidates.map((c) => (
                <NewMessagePersonRow
                  key={c.id}
                  candidate={c}
                  pending={pendingId === c.id}
                  disabled={pendingId != null}
                  onPick={pick}
                />
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
