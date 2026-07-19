'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import type { ChannelMember } from '../../../../api/types';
import { isoFromLocalInputValue, localInputMinValue } from './member-format';

interface MuteCustomDialogProps {
  target: ChannelMember | null;
  until: string;
  setUntil: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function MuteCustomDialog({
  target,
  until,
  setUntil,
  onClose,
  onSubmit,
  isPending
}: MuteCustomDialogProps) {
  return (
    <Dialog open={target != null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Mute member until…</DialogTitle>
          <DialogDescription>
            {target?.user?.full_name
              ? `Pick when ${target.user.full_name}'s mute should lift.`
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
            value={until}
            min={localInputMinValue()}
            onChange={(e) => setUntil(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant='ghost' onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isPending || !isoFromLocalInputValue(until)}
          >
            {isPending ? (
              <Icons.spinner className='mr-1 h-3.5 w-3.5 animate-spin' />
            ) : null}
            Mute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
