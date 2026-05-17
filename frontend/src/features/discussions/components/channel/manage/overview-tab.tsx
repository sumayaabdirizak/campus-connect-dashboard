'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  useChannelOverwrites,
  useDeleteChannelOverwrite,
  usePutChannelOverwrite,
  useServer,
  useUpdateChannel
} from '../../../api/queries';
import {
  PERMISSION_BITS,
  type DiscussionChannel,
  type DiscussionChannelKind
} from '../../../api/types';

const TOPIC_MAX = 1024;
const NAME_MAX = 64;
const UNCATEGORIZED = '__uncategorized__';

const SLOW_CUSTOM = 'custom';
/** Seconds — must stay in sync with backend `patchChannelSchema` max (21600). */
const SLOW_PRESET_SECS = [0, 5, 10, 30, 60, 300, 900] as const;

function isPresetSlowSeconds(s: number): boolean {
  return (SLOW_PRESET_SECS as readonly number[]).includes(s);
}

/** Bits denied on @everyone when the channel is locked (read-only). */
const LOCK_DENY_BITS =
  PERMISSION_BITS.SEND_MESSAGES |
  PERMISSION_BITS.CREATE_THREADS |
  PERMISSION_BITS.ADD_REACTIONS;

function toBigIntMask(s: string | undefined | null): bigint {
  if (!s) return BigInt(0);
  try {
    return BigInt(s);
  } catch {
    return BigInt(0);
  }
}

const KIND_OPTIONS: Array<{
  value: DiscussionChannelKind;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'TEXT',
    label: 'Text',
    description: 'Free-form discussion. Everyone with access can post and reply.',
    Icon: Icons.hash
  },
  {
    value: 'ANNOUNCEMENT',
    label: 'Announcement',
    description:
      'Only members with Send Messages can post. Best for read-mostly channels.',
    Icon: Icons.speakerphone
  },
  {
    value: 'FORUM',
    label: 'Forum',
    description:
      'Questions and threads with answers. Mirrors the Campuswire Q&A surface.',
    Icon: Icons.chat ?? Icons.hash
  }
];

/**
 * Overview tab — channel Name + Topic editor.
 *
 * Lifted out of the legacy single-form `channel-settings-dialog.tsx` so the
 * dialog can host multiple tabs (Members / Permissions / Pins / Danger zone)
 * without remounting. Owns its own dirty state and re-syncs whenever the
 * underlying channel row changes.
 */
export function OverviewTab({
  channel,
  canManageRoles,
  onSaved,
  onCancel
}: {
  channel: DiscussionChannel;
  /** Required to edit the @everyone lock overwrite (same gate as Permissions tab). */
  canManageRoles: boolean;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const updateMut = useUpdateChannel(channel.id);
  const { data: serverDetail } = useServer(channel.serverId);
  const { data: overwritesData } = useChannelOverwrites(channel.id, {
    enabled: canManageRoles
  });
  const putOverwriteMut = usePutChannelOverwrite(channel.id);
  const deleteOverwriteMut = useDeleteChannelOverwrite(channel.id);
  const [name, setName] = useState(channel.name ?? '');
  const [topic, setTopic] = useState(channel.topic ?? '');
  // Stored as a string because Radix Select demands string values and
  // `null` (uncategorized) needs a sentinel.
  const initialCategoryValue =
    channel.categoryId == null ? UNCATEGORIZED : String(channel.categoryId);
  const [categoryValue, setCategoryValue] = useState<string>(initialCategoryValue);
  const initialKind: DiscussionChannelKind =
    channel.kind === 'ANNOUNCEMENT' || channel.kind === 'FORUM'
      ? channel.kind
      : 'TEXT';
  const [kind, setKind] = useState<DiscussionChannelKind>(initialKind);
  const [isPrivate, setIsPrivate] = useState<boolean>(!!channel.isPrivate);

  const initialSlowSeconds = Number(channel.slowModeSeconds ?? 0) || 0;
  const [slowModePreset, setSlowModePreset] = useState<string>(() =>
    isPresetSlowSeconds(initialSlowSeconds) ? String(initialSlowSeconds) : SLOW_CUSTOM
  );
  const [slowModeCustom, setSlowModeCustom] = useState<string>(() =>
    isPresetSlowSeconds(initialSlowSeconds)
      ? '60'
      : String(Math.max(1, initialSlowSeconds))
  );

  // Re-sync when the dialog flips between channels, or after a server update
  // refreshes the cached row.
  useEffect(() => {
    setName(channel.name ?? '');
    setTopic(channel.topic ?? '');
    setCategoryValue(
      channel.categoryId == null ? UNCATEGORIZED : String(channel.categoryId)
    );
    setKind(
      channel.kind === 'ANNOUNCEMENT' || channel.kind === 'FORUM'
        ? channel.kind
        : 'TEXT'
    );
    setIsPrivate(!!channel.isPrivate);
    const s0 = Number(channel.slowModeSeconds ?? 0) || 0;
    setSlowModePreset(isPresetSlowSeconds(s0) ? String(s0) : SLOW_CUSTOM);
    setSlowModeCustom(
      isPresetSlowSeconds(s0) ? '60' : String(Math.max(1, s0))
    );
  }, [
    channel.id,
    channel.name,
    channel.topic,
    channel.categoryId,
    channel.kind,
    channel.isPrivate,
    channel.slowModeSeconds
  ]);

  const sortedCategories = useMemo(() => {
    const list = serverDetail?.categories ?? [];
    return [...list].sort(
      (a, b) => a.position - b.position || a.id - b.id
    );
  }, [serverDetail?.categories]);

  const everyoneRoleId = useMemo(() => {
    const roles = serverDetail?.roles ?? [];
    const byKey = roles.find((r) => r.systemKey === 'EVERYONE');
    if (byKey) return byKey.id;
    const byName = roles.find((r) => {
      const n = r.name.trim().toLowerCase();
      return n === '@everyone' || n === 'everyone';
    });
    return byName?.id ?? null;
  }, [serverDetail?.roles]);

  const everyoneOverwrite = useMemo(() => {
    if (everyoneRoleId == null) return undefined;
    return (overwritesData?.results ?? []).find(
      (o) => o.targetType === 'ROLE' && o.targetId === everyoneRoleId
    );
  }, [overwritesData?.results, everyoneRoleId]);

  const isChannelLocked = useMemo(() => {
    if (!everyoneOverwrite) return false;
    const d = toBigIntMask(everyoneOverwrite.deny);
    return (d & LOCK_DENY_BITS) === LOCK_DENY_BITS;
  }, [everyoneOverwrite]);

  const lockBusy =
    putOverwriteMut.isPending || deleteOverwriteMut.isPending;

  const resolvedSlowSeconds = useMemo(() => {
    if (slowModePreset === SLOW_CUSTOM) {
      const n = parseInt(slowModeCustom, 10);
      if (!Number.isFinite(n) || n < 1 || n > 21600) return null;
      return n;
    }
    return Number(slowModePreset) || 0;
  }, [slowModePreset, slowModeCustom]);

  const slowInvalid =
    slowModePreset === SLOW_CUSTOM && resolvedSlowSeconds === null;
  const slowDirty =
    resolvedSlowSeconds !== null &&
    resolvedSlowSeconds !== initialSlowSeconds;

  const isArchived = !!channel.archivedAt;
  const trimmedName = name.trim();
  const trimmedTopic = topic.trim();
  const nameChanged = trimmedName !== (channel.name ?? '').trim();
  const topicChanged = trimmedTopic !== (channel.topic ?? '').trim();
  const categoryChanged = categoryValue !== initialCategoryValue;
  const kindChanged = kind !== initialKind;
  const isPrivateChanged = isPrivate !== !!channel.isPrivate;
  // The backend rejects privatizing the default channel because @everyone
  // would lose access. Surface the same rule inline so the Save button
  // doesn't appear to lie.
  const blockedByDefault = isPrivate && !!channel.isDefault;
  const dirty =
    nameChanged ||
    topicChanged ||
    categoryChanged ||
    kindChanged ||
    isPrivateChanged ||
    slowDirty;
  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;
  const canSave =
    dirty &&
    nameValid &&
    !updateMut.isPending &&
    !isArchived &&
    !blockedByDefault &&
    !slowInvalid;

  const handleSave = () => {
    if (!canSave) return;
    const body: {
      name?: string;
      topic?: string | null;
      categoryId?: number | null;
      kind?: DiscussionChannelKind;
      isPrivate?: boolean;
      slowModeSeconds?: number;
    } = {};
    if (nameChanged) body.name = trimmedName;
    if (topicChanged) body.topic = trimmedTopic.length === 0 ? null : trimmedTopic;
    if (categoryChanged) {
      if (categoryValue === UNCATEGORIZED) {
        body.categoryId = null;
      } else {
        const n = Number(categoryValue);
        if (Number.isFinite(n) && n > 0) body.categoryId = n;
      }
    }
    if (kindChanged) body.kind = kind;
    if (isPrivateChanged) body.isPrivate = isPrivate;
    if (slowDirty && resolvedSlowSeconds !== null) {
      body.slowModeSeconds = resolvedSlowSeconds;
    }
    updateMut.mutate(body, {
      onSuccess: () => onSaved()
    });
  };

  const handleLockChannel = (nextLocked: boolean) => {
    if (isArchived || !canManageRoles || everyoneRoleId == null) return;
    const allow = toBigIntMask(everyoneOverwrite?.allow ?? '0');
    let deny = toBigIntMask(everyoneOverwrite?.deny ?? '0');
    if (nextLocked) {
      deny |= LOCK_DENY_BITS;
      putOverwriteMut.mutate(
        {
          targetType: 'ROLE',
          targetId: everyoneRoleId,
          allow: allow.toString(),
          deny: deny.toString()
        },
        {
          onSuccess: () => toast.success('Channel locked')
        }
      );
      return;
    }
    deny &= ~LOCK_DENY_BITS;
    if (deny === BigInt(0) && allow === BigInt(0)) {
      if (everyoneOverwrite) {
        deleteOverwriteMut.mutate(
          {
            targetType: 'ROLE',
            targetId: everyoneRoleId,
            quiet: true
          },
          {
            onSuccess: () => toast.success('Channel unlocked')
          }
        );
      }
    } else {
      putOverwriteMut.mutate(
        {
          targetType: 'ROLE',
          targetId: everyoneRoleId,
          allow: allow.toString(),
          deny: deny.toString()
        },
        {
          onSuccess: () => toast.success('Channel unlocked')
        }
      );
    }
  };

  return (
    <div className='space-y-4'>
      {isArchived && (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400'>
          This channel is archived. Restore it from the Danger zone to edit
          name and topic.
        </div>
      )}

      <div className='space-y-1.5'>
        <Label htmlFor='channel-name' className='text-xs'>
          Name
        </Label>
        <Input
          id='channel-name'
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
          placeholder='general'
          disabled={isArchived}
          maxLength={NAME_MAX}
        />
        <div className='flex items-center justify-between px-1 text-[10px] text-muted-foreground'>
          <span>
            {trimmedName.length === 0
              ? 'Required'
              : `${trimmedName.length}/${NAME_MAX}`}
          </span>
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='channel-topic' className='text-xs'>
          Topic
        </Label>
        <Textarea
          id='channel-topic'
          value={topic}
          onChange={(e) => setTopic(e.target.value.slice(0, TOPIC_MAX))}
          placeholder='What is this channel about?'
          disabled={isArchived}
          rows={3}
          maxLength={TOPIC_MAX}
          className='resize-none'
        />
        <div className='flex items-center justify-between px-1 text-[10px] text-muted-foreground'>
          <span>
            {topic.length}/{TOPIC_MAX}
          </span>
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='channel-category' className='text-xs'>
          Category
        </Label>
        <Select
          value={categoryValue}
          onValueChange={setCategoryValue}
          disabled={isArchived}
        >
          <SelectTrigger id='channel-category' className='w-full'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
            {sortedCategories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoryChanged && (
          <p className='px-1 text-[10px] text-muted-foreground'>
            Moving will place this channel at the bottom of the new category.
          </p>
        )}
      </div>

      <div className='space-y-2'>
        <div className='flex items-center gap-1.5'>
          <Label className='text-xs'>Channel type</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type='button'
                className='text-muted-foreground transition-colors hover:text-foreground'
                aria-label='About channel types'
              >
                <Icons.info className='h-3 w-3' />
              </button>
            </TooltipTrigger>
            <TooltipContent side='top' className='max-w-xs text-xs'>
              Type controls posting rules and how the channel feels. You can
              change it later, but Forum may surface old plain messages as
              ungrouped threads.
            </TooltipContent>
          </Tooltip>
        </div>
        <RadioGroup
          value={kind}
          onValueChange={(v) => setKind(v as DiscussionChannelKind)}
          className='gap-2'
          disabled={isArchived}
        >
          {KIND_OPTIONS.map(({ value, label, description, Icon }) => {
            const selected = kind === value;
            return (
              <Label
                key={value}
                htmlFor={`channel-kind-${value}`}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-2.5 text-left transition-colors',
                  'hover:bg-muted/50',
                  selected
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border',
                  isArchived && 'cursor-not-allowed opacity-60'
                )}
              >
                <RadioGroupItem
                  id={`channel-kind-${value}`}
                  value={value}
                  className='mt-0.5'
                />
                <Icon className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
                <div className='flex-1 space-y-0.5'>
                  <div className='text-sm font-medium leading-none'>
                    {label}
                  </div>
                  <p className='text-[11px] leading-snug text-muted-foreground'>
                    {description}
                  </p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      <div className='space-y-2 rounded-md border p-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-0.5'>
            <Label
              htmlFor='channel-private'
              className='text-sm font-medium'
            >
              Private channel
            </Label>
            <p className='text-[11px] leading-snug text-muted-foreground'>
              Only roles with an explicit <span className='font-mono'>Allow</span>{' '}
              get access. Other members won&apos;t see this channel in their
              sidebar.
            </p>
          </div>
          <Switch
            id='channel-private'
            checked={isPrivate}
            onCheckedChange={setIsPrivate}
            disabled={isArchived || !!channel.isDefault}
          />
        </div>
        {channel.isDefault && (
          <p className='text-[11px] leading-snug text-amber-600 dark:text-amber-400'>
            This is the server&apos;s default channel and can&apos;t be private.
            Promote another channel to default to lock this one down.
          </p>
        )}
        {isPrivate && !channel.isDefault && (
          <p className='text-[11px] leading-snug text-muted-foreground'>
            Tip: configure who can see it in the Permissions tab once it ships.
          </p>
        )}
      </div>

      <div className='space-y-2 rounded-md border p-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-0.5'>
            <Label
              htmlFor='channel-lock'
              className='text-sm font-medium'
            >
              Lock channel (read-only)
            </Label>
            <p className='text-[11px] leading-snug text-muted-foreground'>
              Applies an <span className='font-mono'>@everyone</span> deny on
              send, threads, and reactions. Other roles can still be allowed in
              the Permissions tab.
            </p>
          </div>
          <Switch
            id='channel-lock'
            checked={isChannelLocked}
            onCheckedChange={handleLockChannel}
            disabled={
              isArchived ||
              !canManageRoles ||
              everyoneRoleId == null ||
              lockBusy
            }
          />
        </div>
        {!canManageRoles && (
          <p className='text-[11px] leading-snug text-muted-foreground'>
            You need permission to manage roles to change this setting.
          </p>
        )}
        {canManageRoles && everyoneRoleId == null && (
          <p className='text-[11px] leading-snug text-amber-600 dark:text-amber-400'>
            Could not find the server&apos;s @everyone role yet. Try again in a
            moment.
          </p>
        )}
      </div>

      <div className='space-y-2 rounded-md border p-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-1.5'>
            <Label htmlFor='channel-slow-mode' className='text-xs'>
              Slow mode
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type='button'
                  className='text-muted-foreground transition-colors hover:text-foreground'
                  aria-label='About slow mode'
                >
                  <Icons.info className='h-3 w-3' />
                </button>
              </TooltipTrigger>
              <TooltipContent side='top' className='max-w-xs text-xs'>
                Members wait this long between their own messages in this channel.
                Moderators who can manage messages are not rate-limited.
              </TooltipContent>
            </Tooltip>
          </div>
          <Select
            value={slowModePreset}
            onValueChange={(v) => {
              setSlowModePreset(v);
              if (v === SLOW_CUSTOM) {
                const prev =
                  slowModePreset === SLOW_CUSTOM
                    ? parseInt(slowModeCustom, 10)
                    : Number(slowModePreset);
                setSlowModeCustom(
                  String(
                    Number.isFinite(prev) && prev > 0 && prev <= 21600
                      ? prev
                      : 60
                  )
                );
              }
            }}
            disabled={isArchived}
          >
            <SelectTrigger id='channel-slow-mode' className='w-full'>
              <SelectValue placeholder='Rate limit' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='0'>Off</SelectItem>
              <SelectItem value='5'>5 seconds</SelectItem>
              <SelectItem value='10'>10 seconds</SelectItem>
              <SelectItem value='30'>30 seconds</SelectItem>
              <SelectItem value='60'>1 minute</SelectItem>
              <SelectItem value='300'>5 minutes</SelectItem>
              <SelectItem value='900'>15 minutes</SelectItem>
              <SelectItem value={SLOW_CUSTOM}>Custom…</SelectItem>
            </SelectContent>
          </Select>
          {slowModePreset === SLOW_CUSTOM && (
            <div className='space-y-1'>
              <Label
                htmlFor='channel-slow-custom'
                className='text-[10px] text-muted-foreground'
              >
                Seconds (1–21600)
              </Label>
              <Input
                id='channel-slow-custom'
                type='number'
                inputMode='numeric'
                min={1}
                max={21600}
                value={slowModeCustom}
                onChange={(e) => setSlowModeCustom(e.target.value)}
                disabled={isArchived}
                className='h-8'
              />
              {slowInvalid && (
                <p className='text-[11px] text-destructive'>
                  Enter a whole number from 1 to 21600.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className='flex items-center justify-end gap-2 pt-2'>
        <Button variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {updateMut.isPending ? (
            <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
          ) : null}
          Save changes
        </Button>
      </div>
    </div>
  );
}
