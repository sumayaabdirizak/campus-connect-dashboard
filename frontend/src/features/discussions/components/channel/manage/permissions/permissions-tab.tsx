'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import type { DiscussionChannel } from '../../../../api/types';
import { OverwriteList } from './overwrite-list';
import { usePermissionsTab } from './use-permissions-tab';

/**
 * Permissions tab — Discord-style per-channel allow/deny overwrites.
 * Gated by `canManageRoles` at the dialog level; backend re-checks MANAGE_ROLES.
 */
export function PermissionsTab({ channel }: { channel: DiscussionChannel }) {
  const p = usePermissionsTab(channel);

  if (p.isLoading && p.overwrites.length === 0) {
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
          {p.roleOverwrites.length > 0 ? (
            <Badge variant='secondary' className='h-4 text-[10px]'>
              {p.roleOverwrites.length}
            </Badge>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value='members' className='gap-1.5'>
          <Icons.teams className='h-3.5 w-3.5' />
          Members
          {p.memberOverwrites.length > 0 ? (
            <Badge variant='secondary' className='h-4 text-[10px]'>
              {p.memberOverwrites.length}
            </Badge>
          ) : null}
        </TabsTrigger>
      </TabsList>
      <TabsContent value='roles' className='m-0'>
        <OverwriteList
          channelId={p.channelId}
          kind='ROLE'
          overwrites={p.roleOverwrites}
          pickerOptions={p.rolePickerOptions}
          resolveName={(id) => p.roleNameById.get(id) ?? `Role ${id}`}
          resolveSubtitle={() => null}
          onAdd={(id) => p.handleAdd('ROLE', id)}
        />
      </TabsContent>
      <TabsContent value='members' className='m-0'>
        <OverwriteList
          channelId={p.channelId}
          kind='MEMBER'
          overwrites={p.memberOverwrites}
          pickerOptions={p.memberPickerOptions}
          resolveName={(id) => p.memberById.get(id)?.user?.full_name ?? `User ${id}`}
          resolveSubtitle={(id) => p.memberById.get(id)?.user?.email ?? null}
          onAdd={(id) => p.handleAdd('MEMBER', id)}
        />
      </TabsContent>
    </Tabs>
  );
}
