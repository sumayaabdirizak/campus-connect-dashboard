'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  useDeleteChannelOverwrite,
  usePutChannelOverwrite
} from '../../../../api/queries';
import { PERMISSION_BITS, type DiscussionOverwrite } from '../../../../api/types';
import { applyState, decodeState, toBigInt, type CellState } from './bitmask';
import { PERMISSION_GROUPS } from './permission-groups';
import { PermissionCell } from './permission-cell';

interface OverwriteCardProps {
  channelId: number;
  overwrite: DiscussionOverwrite;
  targetName: string;
  targetSubtitle: string | null;
  isOptimistic: boolean;
}

export function OverwriteCard({
  channelId,
  overwrite,
  targetName,
  targetSubtitle,
  isOptimistic
}: OverwriteCardProps) {
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
              <AvatarFallback>{targetName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5 text-sm font-medium'>
              <span className='truncate'>{targetName}</span>
              {isOptimistic ? (
                <Badge variant='secondary' className='h-4 text-[9px]'>
                  Saving…
                </Badge>
              ) : null}
            </div>
            {targetSubtitle ? (
              <p className='truncate text-[11px] text-muted-foreground'>{targetSubtitle}</p>
            ) : null}
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
