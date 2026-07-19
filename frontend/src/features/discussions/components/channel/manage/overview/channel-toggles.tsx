'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PrivateChannelToggleProps {
  isPrivate: boolean;
  setIsPrivate: (v: boolean) => void;
  isDefault: boolean;
  isArchived: boolean;
}

export function PrivateChannelToggle({
  isPrivate,
  setIsPrivate,
  isDefault,
  isArchived
}: PrivateChannelToggleProps) {
  return (
    <div className='space-y-2 rounded-md border p-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-0.5'>
          <Label htmlFor='channel-private' className='text-sm font-medium'>
            Private channel
          </Label>
          <p className='text-[11px] leading-snug text-muted-foreground'>
            Only roles with an explicit <span className='font-mono'>Allow</span> get
            access. Other members won&apos;t see this channel in their sidebar.
          </p>
        </div>
        <Switch
          id='channel-private'
          checked={isPrivate}
          onCheckedChange={setIsPrivate}
          disabled={isArchived || isDefault}
        />
      </div>
      {isDefault ? (
        <p className='text-[11px] leading-snug text-amber-600 dark:text-amber-400'>
          This is the server&apos;s default channel and can&apos;t be private.
          Promote another channel to default to lock this one down.
        </p>
      ) : null}
      {isPrivate && !isDefault ? (
        <p className='text-[11px] leading-snug text-muted-foreground'>
          Tip: configure who can see it in the Permissions tab once it ships.
        </p>
      ) : null}
    </div>
  );
}

interface LockChannelToggleProps {
  locked: boolean;
  onToggle: (next: boolean) => void;
  isArchived: boolean;
  canManageRoles: boolean;
  everyoneRoleId: number | null;
  lockBusy: boolean;
}

export function LockChannelToggle({
  locked,
  onToggle,
  isArchived,
  canManageRoles,
  everyoneRoleId,
  lockBusy
}: LockChannelToggleProps) {
  return (
    <div className='space-y-2 rounded-md border p-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-0.5'>
          <Label htmlFor='channel-lock' className='text-sm font-medium'>
            Lock channel (read-only)
          </Label>
          <p className='text-[11px] leading-snug text-muted-foreground'>
            Applies an <span className='font-mono'>@everyone</span> deny on send,
            threads, and reactions. Other roles can still be allowed in the
            Permissions tab.
          </p>
        </div>
        <Switch
          id='channel-lock'
          checked={locked}
          onCheckedChange={onToggle}
          disabled={
            isArchived || !canManageRoles || everyoneRoleId == null || lockBusy
          }
        />
      </div>
      {!canManageRoles ? (
        <p className='text-[11px] leading-snug text-muted-foreground'>
          You need permission to manage roles to change this setting.
        </p>
      ) : null}
      {canManageRoles && everyoneRoleId == null ? (
        <p className='text-[11px] leading-snug text-amber-600 dark:text-amber-400'>
          Could not find the server&apos;s @everyone role yet. Try again in a
          moment.
        </p>
      ) : null}
    </div>
  );
}
