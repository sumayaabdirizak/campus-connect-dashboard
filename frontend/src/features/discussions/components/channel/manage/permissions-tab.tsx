'use client';

import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  useChannelMembers,
  useChannelOverwrites,
  useDeleteChannelOverwrite,
  usePutChannelOverwrite,
  useServer
} from '../../../api/queries';
import {
  PERMISSION_BITS,
  type DiscussionChannel,
  type DiscussionOverwrite,
  type DiscussionOverwriteTarget,
  type DiscussionRoleRow
} from '../../../api/types';

// ─── Permission catalog ───────────────────────────────────────────────────
//
// Only bits that are meaningfully *per-channel* are surfaced here. The
// backend stores the full bitmask so server-only bits like MANAGE_SERVER or
// KICK_MEMBERS can technically appear in an overwrite row, but they have no
// channel-level effect — surfacing them would just be a confusing footgun.

type PermBitName = keyof typeof PERMISSION_BITS;

type PermissionEntry = {
  bit: PermBitName;
  label: string;
  description: string;
};

type PermissionGroup = {
  id: string;
  label: string;
  entries: PermissionEntry[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'general',
    label: 'General',
    entries: [
      {
        bit: 'VIEW_CHANNEL',
        label: 'View channel',
        description: 'See this channel in the sidebar and load its messages.'
      },
      {
        bit: 'READ_MESSAGE_HISTORY',
        label: 'Read message history',
        description: 'Scroll back through messages posted before joining.'
      }
    ]
  },
  {
    id: 'messages',
    label: 'Messages',
    entries: [
      {
        bit: 'SEND_MESSAGES',
        label: 'Send messages',
        description: 'Post new messages in this channel.'
      },
      {
        bit: 'ATTACH_FILES',
        label: 'Attach files',
        description: 'Upload images, documents, and other attachments.'
      },
      {
        bit: 'EMBED_LINKS',
        label: 'Embed links',
        description: 'Expand URLs into rich previews.'
      },
      {
        bit: 'ADD_REACTIONS',
        label: 'Add reactions',
        description: 'React to messages with emoji.'
      },
      {
        bit: 'USE_EXTERNAL_EMOJI',
        label: 'Use external emoji',
        description: 'Send emoji from other servers.'
      },
      {
        bit: 'MENTION_EVERYONE',
        label: 'Mention @everyone',
        description: 'Ping everyone with VIEW_CHANNEL.'
      }
    ]
  },
  {
    id: 'threads',
    label: 'Threads',
    entries: [
      {
        bit: 'CREATE_THREADS',
        label: 'Create threads',
        description: 'Start a threaded conversation on a message.'
      },
      {
        bit: 'SEND_MESSAGES_IN_THREADS',
        label: 'Reply in threads',
        description: 'Post inside an open thread.'
      },
      {
        bit: 'MANAGE_THREADS',
        label: 'Manage threads',
        description: 'Lock, archive, and rename threads.'
      }
    ]
  },
  {
    id: 'moderation',
    label: 'Moderation',
    entries: [
      {
        bit: 'MANAGE_MESSAGES',
        label: 'Manage messages',
        description: 'Delete other members\u2019 messages and accept answers.'
      },
      {
        bit: 'PIN_MESSAGES',
        label: 'Pin messages',
        description: 'Pin or unpin messages in this channel.'
      },
      {
        bit: 'MANAGE_CHANNEL',
        label: 'Manage channel',
        description: 'Edit settings, archive, rename, or move this channel.'
      },
      {
        bit: 'MANAGE_ROLES',
        label: 'Manage permissions',
        description: 'Edit this overwrite list. Grant carefully.'
      }
    ]
  }
];

// ─── Bitmask helpers ──────────────────────────────────────────────────────

function toBigInt(input: string | undefined | null): bigint {
  if (!input) return BigInt(0);
  try {
    return BigInt(input);
  } catch {
    return BigInt(0);
  }
}

type CellState = 'allow' | 'inherit' | 'deny';

function decodeState(
  allow: bigint,
  deny: bigint,
  bit: bigint
): CellState {
  // Both bits set is an invalid state; treat allow as the winner because
  // that's what the backend normalizes to on write.
  if ((allow & bit) !== BigInt(0)) return 'allow';
  if ((deny & bit) !== BigInt(0)) return 'deny';
  return 'inherit';
}

function applyState(
  allow: bigint,
  deny: bigint,
  bit: bigint,
  next: CellState
): { allow: string; deny: string } {
  let nextAllow = allow;
  let nextDeny = deny;
  if (next === 'allow') {
    nextAllow |= bit;
    nextDeny &= ~bit;
  } else if (next === 'deny') {
    nextAllow &= ~bit;
    nextDeny |= bit;
  } else {
    nextAllow &= ~bit;
    nextDeny &= ~bit;
  }
  return { allow: nextAllow.toString(), deny: nextDeny.toString() };
}

// ─── Per-cell 3-state tri-toggle ──────────────────────────────────────────

const CELL_BUTTONS: Array<{
  state: CellState;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: string;
  hover: string;
}> = [
  {
    state: 'deny',
    label: 'Deny',
    Icon: Icons.close,
    active: 'bg-destructive text-destructive-foreground',
    hover: 'hover:bg-destructive/10 hover:text-destructive'
  },
  {
    state: 'inherit',
    label: 'Inherit',
    Icon: Icons.minus,
    active: 'bg-muted text-foreground',
    hover: 'hover:bg-muted'
  },
  {
    state: 'allow',
    label: 'Allow',
    Icon: Icons.check,
    active: 'bg-emerald-500 text-white dark:bg-emerald-600',
    hover: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400'
  }
];

function PermissionCell({
  state,
  disabled,
  onChange
}: {
  state: CellState;
  disabled: boolean;
  onChange: (next: CellState) => void;
}) {
  return (
    <div
      role='radiogroup'
      className='inline-flex items-center gap-0.5 rounded-md border bg-background p-0.5'
    >
      {CELL_BUTTONS.map((b) => {
        const selected = b.state === state;
        return (
          <button
            key={b.state}
            type='button'
            role='radio'
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(b.state)}
            className={cn(
              'flex h-6 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors',
              !selected && !disabled && b.hover,
              selected && b.active,
              disabled && 'cursor-not-allowed opacity-50'
            )}
            title={b.label}
            aria-label={b.label}
          >
            <b.Icon className='h-3.5 w-3.5' />
          </button>
        );
      })}
    </div>
  );
}

// ─── One overwrite card (header + grid) ───────────────────────────────────

function OverwriteCard({
  channelId,
  overwrite,
  targetName,
  targetSubtitle,
  isOptimistic
}: {
  channelId: number;
  overwrite: DiscussionOverwrite;
  targetName: string;
  targetSubtitle: string | null;
  isOptimistic: boolean;
}) {
  const putMut = usePutChannelOverwrite(channelId);
  const delMut = useDeleteChannelOverwrite(channelId);
  const allow = toBigInt(overwrite.allow);
  const deny = toBigInt(overwrite.deny);

  const handleChange = (bit: bigint, next: CellState) => {
    const masks = applyState(allow, deny, bit, next);
    putMut.mutate({
      targetType: overwrite.targetType,
      targetId: overwrite.targetId,
      allow: masks.allow,
      deny: masks.deny
    });
  };

  return (
    <div className='rounded-md border'>
      <div className='flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2'>
        <div className='flex min-w-0 items-center gap-2'>
          {overwrite.targetType === 'ROLE' ? (
            <Icons.badgeCheck className='h-4 w-4 shrink-0 text-muted-foreground' />
          ) : (
            <Avatar className='h-6 w-6 text-[10px]'>
              <AvatarFallback>
                {targetName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5 text-sm font-medium'>
              <span className='truncate'>{targetName}</span>
              {isOptimistic && (
                <Badge variant='secondary' className='h-4 text-[9px]'>
                  Saving…
                </Badge>
              )}
            </div>
            {targetSubtitle && (
              <p className='truncate text-[11px] text-muted-foreground'>
                {targetSubtitle}
              </p>
            )}
          </div>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive'
          onClick={() =>
            delMut.mutate({
              targetType: overwrite.targetType,
              targetId: overwrite.targetId
            })
          }
          disabled={delMut.isPending}
          aria-label='Remove overwrite'
          title='Remove overwrite (resets all bits to Inherit)'
        >
          <Icons.trash className='h-3.5 w-3.5' />
        </Button>
      </div>

      <div className='space-y-4 p-3'>
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.id} className='space-y-2'>
            <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
              {group.label}
            </div>
            <div className='space-y-1'>
              {group.entries.map((entry) => {
                const bit = PERMISSION_BITS[entry.bit];
                const cellState = decodeState(allow, deny, bit);
                return (
                  <div
                    key={entry.bit}
                    className='flex items-center justify-between gap-3 rounded px-1 py-1 hover:bg-muted/40'
                  >
                    <div className='min-w-0 flex-1'>
                      <div className='text-sm leading-none'>{entry.label}</div>
                      <p className='mt-0.5 text-[11px] leading-snug text-muted-foreground'>
                        {entry.description}
                      </p>
                    </div>
                    <PermissionCell
                      state={cellState}
                      disabled={putMut.isPending || delMut.isPending}
                      onChange={(next) => handleChange(bit, next)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Picker: add a target that doesn't have an overwrite yet ──────────────

function AddTargetMenu({
  kind,
  options,
  onPick
}: {
  kind: DiscussionOverwriteTarget;
  options: Array<{ id: number; label: string; subtitle?: string | null }>;
  onPick: (id: number) => void;
}) {
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
              {options.length === 0
                ? 'Everything is already overridden.'
                : 'No matches.'}
            </div>
          ) : (
            filtered.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onSelect={() => onPick(o.id)}
                className='flex flex-col items-start gap-0.5'
              >
                <span className='text-sm leading-none'>{o.label}</span>
                {o.subtitle && (
                  <span className='text-[11px] text-muted-foreground'>
                    {o.subtitle}
                  </span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Empty-state stub ─────────────────────────────────────────────────────

function EmptyState({
  kind,
  picker
}: {
  kind: DiscussionOverwriteTarget;
  picker: React.ReactNode;
}) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-10 text-center'>
      <div className='rounded-full bg-muted p-3'>
        <Icons.lock className='h-5 w-5 text-muted-foreground' />
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-medium'>
          No {kind === 'ROLE' ? 'role' : 'member'} overwrites
        </p>
        <p className='mx-auto max-w-sm text-xs text-muted-foreground'>
          This channel inherits from server-wide role defaults. Add an
          overwrite to grant or restrict access for a specific{' '}
          {kind === 'ROLE' ? 'role' : 'member'}.
        </p>
      </div>
      <div>{picker}</div>
    </div>
  );
}

// ─── Sub-tab body ─────────────────────────────────────────────────────────

function OverwriteList({
  channelId,
  kind,
  overwrites,
  pickerOptions,
  resolveName,
  resolveSubtitle,
  onAdd
}: {
  channelId: number;
  kind: DiscussionOverwriteTarget;
  overwrites: DiscussionOverwrite[];
  pickerOptions: Array<{ id: number; label: string; subtitle?: string | null }>;
  resolveName: (id: number) => string;
  resolveSubtitle: (id: number) => string | null;
  onAdd: (id: number) => void;
}) {
  const picker = (
    <AddTargetMenu kind={kind} options={pickerOptions} onPick={onAdd} />
  );

  if (overwrites.length === 0) {
    return <EmptyState kind={kind} picker={picker} />;
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <p className='text-[11px] text-muted-foreground'>
          {overwrites.length} {kind === 'ROLE' ? 'role' : 'member'}
          {overwrites.length === 1 ? '' : 's'} with an overwrite
        </p>
        {picker}
      </div>
      <div className='space-y-3'>
        {overwrites.map((o) => (
          <OverwriteCard
            key={`${o.targetType}-${o.targetId}`}
            channelId={channelId}
            overwrite={o}
            targetName={resolveName(o.targetId)}
            targetSubtitle={resolveSubtitle(o.targetId)}
            isOptimistic={o.id < 0}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

/**
 * Permissions tab (A7) — Discord-style per-channel allow/deny overwrites.
 *
 * Two sub-tabs (Roles / Members) wrap a list of cards, one per target. Each
 * card hosts a 3-state grid (Allow / Inherit / Deny) for every channel-
 * applicable bit. Each cell click PUTs the new mask immediately with an
 * optimistic local patch; the row briefly shows a "Saving…" badge while
 * the request is in flight.
 *
 * Targets that already have an overwrite are filtered out of the "+ Add"
 * picker so the user can't accidentally upsert a row they're already
 * editing.
 *
 * The tab itself is gated by `canManageRoles` at the dialog level
 * (`channel-settings-dialog.tsx`), and the backend re-checks
 * `MANAGE_ROLES` on every endpoint.
 */
export function PermissionsTab({
  channel
}: {
  channel: DiscussionChannel;
}) {
  const channelId = channel.id;
  const serverId = channel.serverId;

  const { data: overwriteData, isLoading: loadingOverwrites } =
    useChannelOverwrites(channelId);
  const { data: serverDetail, isLoading: loadingServer } = useServer(serverId);
  const { data: memberData, isLoading: loadingMembers } =
    useChannelMembers(channelId);
  const putMut = usePutChannelOverwrite(channelId);

  const overwrites = overwriteData?.results ?? [];
  const roles: DiscussionRoleRow[] = serverDetail?.roles ?? [];
  const members = memberData?.results ?? [];

  const roleOverwrites = useMemo(
    () =>
      overwrites
        .filter((o) => o.targetType === 'ROLE')
        .sort((a, b) => {
          const ra = roles.find((r) => r.id === a.targetId);
          const rb = roles.find((r) => r.id === b.targetId);
          return (
            (ra?.position ?? 0) - (rb?.position ?? 0) || a.targetId - b.targetId
          );
        }),
    [overwrites, roles]
  );

  const memberOverwrites = useMemo(
    () =>
      overwrites
        .filter((o) => o.targetType === 'MEMBER')
        .sort((a, b) => a.targetId - b.targetId),
    [overwrites]
  );

  const overriddenRoleIds = useMemo(
    () => new Set(roleOverwrites.map((o) => o.targetId)),
    [roleOverwrites]
  );
  const overriddenMemberIds = useMemo(
    () => new Set(memberOverwrites.map((o) => o.targetId)),
    [memberOverwrites]
  );

  const rolePickerOptions = useMemo(
    () =>
      [...roles]
        .filter((r) => !overriddenRoleIds.has(r.id))
        .sort(
          (a, b) => b.position - a.position || a.name.localeCompare(b.name)
        )
        .map((r) => ({
          id: r.id,
          label: r.name,
          subtitle: null as string | null
        })),
    [roles, overriddenRoleIds]
  );

  const memberPickerOptions = useMemo(
    () =>
      members
        .filter((m) => m.user && !overriddenMemberIds.has(m.userId))
        .map((m) => ({
          id: m.userId,
          label: m.user?.full_name ?? `User ${m.userId}`,
          subtitle: m.user?.email ?? null
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [members, overriddenMemberIds]
  );

  const roleNameById = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name])),
    [roles]
  );
  const memberById = useMemo(
    () =>
      new Map(
        members
          .filter((m) => m.user != null)
          .map((m) => [m.userId, m])
      ),
    [members]
  );

  const handleAdd = (kind: DiscussionOverwriteTarget, id: number) => {
    // Seed the new overwrite as all-Inherit. The user picks Allow/Deny on
    // each cell after the card appears.
    putMut.mutate({
      targetType: kind,
      targetId: id,
      allow: '0',
      deny: '0'
    });
  };

  const isLoading = loadingOverwrites || loadingServer || loadingMembers;

  if (isLoading && overwrites.length === 0) {
    return (
      <div className='space-y-3'>
        <Skeleton className='h-9 w-full' />
        <Skeleton className='h-40 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    );
  }

  return (
    <Tabs defaultValue='roles' className='gap-3'>
      <TabsList>
        <TabsTrigger value='roles' className='gap-1.5'>
          <Icons.badgeCheck className='h-3.5 w-3.5' />
          Roles
          {roleOverwrites.length > 0 && (
            <Badge variant='secondary' className='h-4 text-[10px]'>
              {roleOverwrites.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value='members' className='gap-1.5'>
          <Icons.teams className='h-3.5 w-3.5' />
          Members
          {memberOverwrites.length > 0 && (
            <Badge variant='secondary' className='h-4 text-[10px]'>
              {memberOverwrites.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value='roles' className='m-0'>
        <OverwriteList
          channelId={channelId}
          kind='ROLE'
          overwrites={roleOverwrites}
          pickerOptions={rolePickerOptions}
          resolveName={(id) => roleNameById.get(id) ?? `Role ${id}`}
          resolveSubtitle={() => null}
          onAdd={(id) => handleAdd('ROLE', id)}
        />
      </TabsContent>

      <TabsContent value='members' className='m-0'>
        <OverwriteList
          channelId={channelId}
          kind='MEMBER'
          overwrites={memberOverwrites}
          pickerOptions={memberPickerOptions}
          resolveName={(id) =>
            memberById.get(id)?.user?.full_name ?? `User ${id}`
          }
          resolveSubtitle={(id) => memberById.get(id)?.user?.email ?? null}
          onAdd={(id) => handleAdd('MEMBER', id)}
        />
      </TabsContent>
    </Tabs>
  );
}
