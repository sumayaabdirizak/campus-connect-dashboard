'use client';

import { Button } from '@/features/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { UserPlus } from 'lucide-react';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';

export function AddMemberControls({
  isAdding,
  candidates,
  pickMember,
  onPickMember,
  onConfirm,
  onCancel,
  onStart,
  confirmPending
}: {
  isAdding: boolean;
  candidates: RosterStudent[];
  pickMember: string;
  onPickMember: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onStart: () => void;
  confirmPending: boolean;
}) {
  if (isAdding) {
    return (
      <div className='mt-3 flex gap-1'>
        <Select value={pickMember} onValueChange={onPickMember}>
          <SelectTrigger className='h-8 text-xs'>
            <SelectValue placeholder='Pick student' />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size='sm' onClick={onConfirm} disabled={!pickMember || confirmPending}>
          Add
        </Button>
        <Button size='sm' variant='ghost' onClick={onCancel}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className='mt-3'>
      <Button
        variant='outline'
        size='sm'
        className='gap-1 w-full'
        onClick={onStart}
        disabled={candidates.length === 0}
      >
        <UserPlus className='w-3.5 h-3.5' /> Add member
      </Button>
    </div>
  );
}
