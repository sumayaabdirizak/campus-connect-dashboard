'use client';

import { useMemo, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { useDiscussionPermissions } from '../../hooks/use-discussion-permissions';
import { OverviewTab } from './manage/overview-tab';
import { MembersTab } from './manage/members-tab';
import { PermissionsTab } from './manage/permissions-tab';
import { PinsTab } from './manage/pins-tab';
import { DangerZoneTab } from './manage/danger-zone-tab';
import { AuditLogTab } from './manage/audit-log-tab';
import type { DiscussionChannel } from '../../api/types';

/**
 * Tabbed shell for channel management (A1).
 *
 * Pins tab lists pins from the discussions pins API (shared cache with the
 * chat pin bar). Other tabs continue to evolve behind this shell.
 *
 * Tab visibility is gated by `useDiscussionPermissions` on the caller's
 * per-channel bitmask:
 *
 *   Overview      -> MANAGE_CHANNEL (lock toggle additionally needs MANAGE_ROLES)
 *   Members       -> KICK_MEMBERS | MUTE_MEMBERS | MODERATE_MEMBERS
 *   Permissions   -> MANAGE_ROLES
 *   Pins          -> PIN_MESSAGES
 *   Audit log     -> VIEW_AUDIT_LOG
 *   Danger zone   -> MANAGE_CHANNEL (permanent delete also needs MANAGE_SERVER)
 *
 * The parent (channel-pane.tsx) already hides the gear button unless the
 * user has MANAGE_CHANNEL, so Overview + Danger zone are guaranteed to be
 * visible whenever the dialog is open.
 *
 * Inactive tabs are kept mounted via `forceMount` so transient state (an
 * unsaved Overview edit, scroll position, future filter inputs) survives a
 * tab switch.
 */

type TabKey = 'overview' | 'members' | 'permissions' | 'pins' | 'audit' | 'danger';

type TabSpec = {
  value: TabKey;
  label: string;
  icon: ReactNode;
  show: boolean;
};

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  channel,
  myPermissions,
  myServerPermissions,
  onChannelHardDeleted,
  onJumpToPinnedMessage
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  channel: DiscussionChannel | null;
  myPermissions: string | null | undefined;
  /** Server-level bitmask (includes MANAGE_SERVER). From GET /servers/:id. */
  myServerPermissions?: string | null | undefined;
  onChannelHardDeleted?: () => void;
  /** Optional: scroll/highlight a message after closing settings (Pins tab). */
  onJumpToPinnedMessage?: (messageId: number) => void;
}) {
  const perms = useDiscussionPermissions(myPermissions);

  const visibleTabs = useMemo<TabSpec[]>(() => {
    const all: TabSpec[] = [
      {
        value: 'overview',
        label: 'Overview',
        icon: <Icons.settings className='h-3.5 w-3.5' />,
        show: perms.canManageChannel
      },
      {
        value: 'members',
        label: 'Members',
        icon: <Icons.teams className='h-3.5 w-3.5' />,
        show:
          perms.canKickMembers ||
          perms.canMuteMembers ||
          perms.canModerateMembers
      },
      {
        value: 'permissions',
        label: 'Permissions',
        icon: <Icons.lock className='h-3.5 w-3.5' />,
        show: perms.canManageRoles
      },
      {
        value: 'pins',
        label: 'Pins',
        icon: <Icons.pin className='h-3.5 w-3.5' />,
        show: perms.canPin
      },
      {
        value: 'audit',
        label: 'Audit log',
        icon: <Icons.post className='h-3.5 w-3.5' />,
        show: perms.canViewAuditLog
      },
      {
        value: 'danger',
        label: 'Danger zone',
        icon: <Icons.warning className='h-3.5 w-3.5' />,
        show: perms.canManageChannel
      }
    ];
    return all.filter((t) => t.show);
  }, [perms]);

  const defaultTab: TabKey = visibleTabs[0]?.value ?? 'overview';

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            Manage <span className='font-mono'>#{channel.name}</span>
          </DialogTitle>
          <DialogDescription>
            Configure this channel. Members see most changes in real time.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className='gap-4'>
          <TabsList className='w-full'>
            {visibleTabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className='gap-1.5'
              >
                {t.icon}
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className='max-h-[60vh] overflow-y-auto pr-1'>
            {perms.canManageChannel && (
              <TabsContent
                value='overview'
                forceMount
                className='data-[state=inactive]:hidden'
              >
                <OverviewTab
                  channel={channel}
                  canManageRoles={perms.canManageRoles}
                  onSaved={() => onOpenChange(false)}
                  onCancel={() => onOpenChange(false)}
                />
              </TabsContent>
            )}

            {(perms.canKickMembers ||
              perms.canMuteMembers ||
              perms.canModerateMembers) && (
              <TabsContent
                value='members'
                forceMount
                className='data-[state=inactive]:hidden'
              >
                <MembersTab
                  channel={channel}
                  myPermissions={myPermissions}
                />
              </TabsContent>
            )}

            {perms.canManageRoles && (
              <TabsContent
                value='permissions'
                forceMount
                className='data-[state=inactive]:hidden'
              >
                <PermissionsTab channel={channel} />
              </TabsContent>
            )}

            {perms.canPin && (
              <TabsContent
                value='pins'
                forceMount
                className='data-[state=inactive]:hidden'
              >
                <PinsTab
                  channelId={channel.id}
                  canManagePins={perms.canPin}
                  onJumpToMessage={(messageId) => {
                    onOpenChange(false);
                    onJumpToPinnedMessage?.(messageId);
                  }}
                />
              </TabsContent>
            )}

            {perms.canViewAuditLog && (
              <TabsContent
                value='audit'
                forceMount
                className='data-[state=inactive]:hidden'
              >
                <AuditLogTab channelId={channel.id} />
              </TabsContent>
            )}

            {perms.canManageChannel && (
              <TabsContent
                value='danger'
                forceMount
                className='data-[state=inactive]:hidden'
              >
                <DangerZoneTab
                  channel={channel}
                  myChannelPermissions={myPermissions}
                  myServerPermissions={myServerPermissions ?? null}
                  onArchiveSuccess={() => onOpenChange(false)}
                  onChannelHardDeleted={onChannelHardDeleted}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
