'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import {
  useChannelMembers,
  useKickServerMember,
  useMuteServerMember,
  useServer,
  useServerPresence
} from '../../../api/queries';
import { useDiscussionPermissions } from '../../../hooks/use-discussion-permissions';
import { PresenceDot } from '../../details/presence-dot';
import type {
  ChannelMember,
  DiscussionChannel,
  DiscussionRole,
  PresenceState
} from '../../../api/types';

const PAGE_SIZE = 50;

// Preset mute durations, in minutes. Custom and Lift are special-cased.
const MUTE_PRESETS: { label: string; minutes: number }[] = [
  { label: '15 minutes', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '24 hours', minutes: 60 * 24 },
  { label: '7 days', minutes: 60 * 24 * 7 }
];

function initialsFor(name: string | null | undefined): string {
  const source = name?.trim() ?? '';
  if (!source) return '?';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatJoinedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  } catch {
    return '';
  }
}

function isoFromMinutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Format a `<input type="datetime-local">` value (`YYYY-MM-DDTHH:mm`) as ISO. */
function isoFromLocalInputValue(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Default `<input type="datetime-local" min>` — one minute from now in local time. */
function localInputMinValue(): string {
  const d = new Date(Date.now() + 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

const ROLE_BADGE_VARIANT: Record<
  DiscussionRole,
  React.ComponentProps<typeof Badge>['variant']
> = {
  OWNER: 'default',
  ADMIN: 'default',
  MODERATOR: 'secondary',
  MEMBER: 'outline'
};

const ROLE_LABEL: Record<DiscussionRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Mod',
  MEMBER: 'Member'
};

function MemberRow({
  member,
  presence,
  showActions,
  canMute,
  canKick,
  onMutePreset,
  onMuteCustom,
  onLiftMute,
  onKick
}: {
  member: ChannelMember;
  presence: PresenceState | undefined;
  showActions: boolean;
  canMute: boolean;
  canKick: boolean;
  onMutePreset: (member: ChannelMember, minutes: number) => void;
  onMuteCustom: (member: ChannelMember) => void;
  onLiftMute: (member: ChannelMember) => void;
  onKick: (member: ChannelMember) => void;
}) {
  const name = member.user?.full_name ?? `Member ${member.userId}`;
  const globalRole = member.user?.role;
  return (
    <div className='group/member flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/60'>
      <div className='relative shrink-0'>
        <Avatar className='h-8 w-8'>
          <AvatarFallback className='text-[11px]'>
            {initialsFor(name)}
          </AvatarFallback>
        </Avatar>
        {presence && <PresenceDot state={presence} />}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='truncate text-sm font-medium'>{name}</span>
          <Badge
            variant={ROLE_BADGE_VARIANT[member.role]}
            className='h-4 px-1.5 text-[10px]'
          >
            {ROLE_LABEL[member.role]}
          </Badge>
        </div>
        <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
          {globalRole && (
            <span className='capitalize'>
              {String(globalRole).replace(/_/g, ' ')}
            </span>
          )}
          {globalRole && <span aria-hidden>·</span>}
          <span>Joined {formatJoinedAt(member.joinedAt)}</span>
        </div>
      </div>
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-7 w-7 opacity-0 transition-opacity focus:opacity-100 group-hover/member:opacity-100 data-[state=open]:opacity-100'
              aria-label={`Manage ${name}`}
            >
              <Icons.ellipsis className='h-3.5 w-3.5' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48'>
            {canMute && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className='gap-2'>
                  <Icons.bellOff className='h-3.5 w-3.5' />
                  Mute
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {MUTE_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.minutes}
                      onSelect={() => onMutePreset(member, preset.minutes)}
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onMuteCustom(member)}>
                    Custom…
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onLiftMute(member)}>
                    Lift mute
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {canMute && canKick && <DropdownMenuSeparator />}
            {canKick && (
              <DropdownMenuItem
                className='gap-2 text-destructive focus:text-destructive'
                onSelect={() => onKick(member)}
              >
                <Icons.trash className='h-3.5 w-3.5' />
                Remove from server
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/**
 * Members tab — read-only list (A2) + mute / kick row actions (A3).
 *
 * Permissions come from the parent dialog as a decimal-string bitmask; we
 * decode them locally to gate the action menu. Server-side `permissions.js`
 * is the source of truth — the UI gating just keeps the menu honest.
 *
 * Server owner row is non-actionable: even if the dean has every bit, the
 * backend refuses to mute or kick the owner and the action menu is hidden
 * for that row entirely.
 */
export function MembersTab({
  channel,
  myPermissions
}: {
  channel: DiscussionChannel;
  myPermissions: string | null | undefined;
}) {
  const perms = useDiscussionPermissions(myPermissions);
  const canMute = perms.canMuteMembers;
  const canKick = perms.canKickMembers || perms.canModerateMembers;

  const { data, isLoading, error } = useChannelMembers(channel.id);
  const { data: presenceData } = useServerPresence(channel.serverId);
  const { data: serverData } = useServer(channel.serverId);
  const ownerId = serverData?.server?.ownerId ?? null;

  const kickMut = useKickServerMember(channel.serverId, channel.id);
  const muteMut = useMuteServerMember(channel.serverId, channel.id);

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  // Active dialog targets — null when closed.
  const [kickTarget, setKickTarget] = useState<ChannelMember | null>(null);
  const [kickConfirmText, setKickConfirmText] = useState('');
  const [muteCustomTarget, setMuteCustomTarget] = useState<ChannelMember | null>(
    null
  );
  const [muteCustomUntil, setMuteCustomUntil] = useState('');

  const presenceById = useMemo<Map<number, PresenceState>>(() => {
    const map = new Map<number, PresenceState>();
    for (const row of presenceData?.results ?? []) {
      map.set(Number(row.userId), row.presence);
    }
    return map;
  }, [presenceData]);

  const members = data?.results ?? [];

  const sortedMembers = useMemo(() => {
    const rank: Record<DiscussionRole, number> = {
      OWNER: 0,
      ADMIN: 1,
      MODERATOR: 2,
      MEMBER: 3
    };
    return [...members].sort((a, b) => {
      const rd = rank[a.role] - rank[b.role];
      if (rd !== 0) return rd;
      const an = a.user?.full_name ?? '';
      const bn = b.user?.full_name ?? '';
      return an.localeCompare(bn);
    });
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedMembers;
    return sortedMembers.filter((m) => {
      const name = (m.user?.full_name ?? '').toLowerCase();
      const email = (m.user?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [sortedMembers, query]);

  const total = filtered.length;
  const needsPagination = total > PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = needsPagination ? safePage * PAGE_SIZE : 0;
  const end = needsPagination ? start + PAGE_SIZE : total;
  const pageRows = filtered.slice(start, end);

  const handleMutePreset = (member: ChannelMember, minutes: number) => {
    muteMut.mutate({
      targetUserId: Number(member.userId),
      until: isoFromMinutesFromNow(minutes)
    });
  };

  const handleLiftMute = (member: ChannelMember) => {
    muteMut.mutate({
      targetUserId: Number(member.userId),
      until: null
    });
  };

  const openCustomMute = (member: ChannelMember) => {
    setMuteCustomUntil(localInputMinValue());
    setMuteCustomTarget(member);
  };

  const submitCustomMute = () => {
    if (!muteCustomTarget) return;
    const iso = isoFromLocalInputValue(muteCustomUntil);
    if (!iso) return;
    muteMut.mutate(
      {
        targetUserId: Number(muteCustomTarget.userId),
        until: iso
      },
      {
        // Close on success only; on error keep the dialog open with the
        // chosen time so the dean can adjust and retry.
        onSuccess: () => {
          setMuteCustomTarget(null);
        }
      }
    );
  };

  const openKick = (member: ChannelMember) => {
    setKickConfirmText('');
    setKickTarget(member);
  };

  const kickTargetName = kickTarget?.user?.full_name?.trim() ?? '';
  const kickConfirmMatches =
    kickConfirmText.trim().toLowerCase() === kickTargetName.toLowerCase() &&
    kickTargetName.length > 0;

  const submitKick = () => {
    if (!kickTarget || !kickConfirmMatches) return;
    kickMut.mutate(Number(kickTarget.userId), {
      // Close on success only; on error the input stays filled so the dean
      // can retry without re-typing the confirmation phrase.
      onSuccess: () => {
        setKickTarget(null);
      }
    });
  };

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 py-10 text-center text-sm text-destructive'>
        <Icons.warning className='h-5 w-5' />
        <span>Couldn’t load members.</span>
        <span className='max-w-sm text-xs opacity-80'>{error.message}</span>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='relative'>
        <Icons.search className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder='Search by name or email'
          className='h-9 pl-8'
          aria-label='Search channel members'
        />
      </div>

      {isLoading ? (
        <div className='space-y-1.5'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3 px-2 py-2'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-3 w-32' />
                <Skeleton className='h-2.5 w-24' />
              </div>
            </div>
          ))}
        </div>
      ) : total === 0 ? (
        <div className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-center'>
          <Icons.teams className='h-5 w-5 text-muted-foreground' />
          <p className='text-xs text-muted-foreground'>
            {query.trim().length > 0
              ? 'No members match this search.'
              : 'No members yet.'}
          </p>
        </div>
      ) : (
        <div className='space-y-0.5'>
          {pageRows.map((m) => {
            const isOwner =
              ownerId != null && Number(m.userId) === Number(ownerId);
            const showActions = !isOwner && (canMute || canKick);
            return (
              <MemberRow
                key={m.userId}
                member={m}
                presence={presenceById.get(Number(m.userId))}
                showActions={showActions}
                canMute={canMute}
                canKick={canKick}
                onMutePreset={handleMutePreset}
                onMuteCustom={openCustomMute}
                onLiftMute={handleLiftMute}
                onKick={openKick}
              />
            );
          })}
        </div>
      )}

      {needsPagination && total > 0 && (
        <div className='flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground'>
          <span>
            Showing {start + 1}–{Math.min(end, total)} of {total}
          </span>
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7'
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              <Icons.chevronLeft className='h-3.5 w-3.5' />
              Prev
            </Button>
            <span className='px-1'>
              {safePage + 1} / {pageCount}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7'
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
            >
              Next
              <Icons.chevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      )}

      {/* Custom mute duration dialog */}
      <Dialog
        open={muteCustomTarget != null}
        onOpenChange={(next) => {
          if (!next) setMuteCustomTarget(null);
        }}
      >
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Mute member until…</DialogTitle>
            <DialogDescription>
              {muteCustomTarget?.user?.full_name
                ? `Pick when ${muteCustomTarget.user.full_name}'s mute should lift.`
                : 'Pick when this mute should lift.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-1.5'>
            <Label htmlFor='mute-until' className='text-xs'>
              Mute until
            </Label>
            <Input
              id='mute-until'
              type='datetime-local'
              value={muteCustomUntil}
              min={localInputMinValue()}
              onChange={(e) => setMuteCustomUntil(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant='ghost'
              onClick={() => setMuteCustomTarget(null)}
              disabled={muteMut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitCustomMute}
              disabled={
                muteMut.isPending ||
                !isoFromLocalInputValue(muteCustomUntil)
              }
            >
              {muteMut.isPending ? (
                <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
              ) : null}
              Mute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Typed-confirm kick dialog */}
      <AlertDialog
        open={kickTarget != null}
        onOpenChange={(next) => {
          if (!next) setKickTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {kickTargetName || 'member'} from the server?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They’ll lose access to every channel in this server until
              re-invited. Their messages and pins stay where they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='space-y-1.5'>
            <Label htmlFor='kick-confirm' className='text-xs'>
              Type <span className='font-mono'>{kickTargetName}</span> to
              confirm
            </Label>
            <Input
              id='kick-confirm'
              value={kickConfirmText}
              onChange={(e) => setKickConfirmText(e.target.value)}
              placeholder={kickTargetName}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={kickMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-white hover:bg-destructive/90'
              disabled={!kickConfirmMatches || kickMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                submitKick();
              }}
            >
              {kickMut.isPending ? (
                <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
