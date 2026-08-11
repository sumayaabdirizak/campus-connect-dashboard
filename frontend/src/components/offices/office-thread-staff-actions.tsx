'use client';

import { CheckCircle2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/features/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/features/ui/components/select';
import { useAuthStore } from '@/lib/auth-store';
import { useOfficeStaff } from '@/lib/offices/queries';
import {
  useClaimOfficeThread,
  useReassignOfficeThread,
  useSetOfficeThreadStatus
} from '@/lib/offices/queries';
import type { OfficeThreadDetail } from '@/lib/offices/types';

export function OfficeThreadStaffActions({ thread }: { thread: OfficeThreadDetail }) {
  const myId = Number(useAuthStore((s) => s.user?.id) ?? 0);
  const claimMutation = useClaimOfficeThread(thread.id);
  const reassignMutation = useReassignOfficeThread(thread.id);
  const statusMutation = useSetOfficeThreadStatus(thread.id);
  const { data: staff = [] } = useOfficeStaff(thread.isManager ? thread.office.id : null);
  const resolved = thread.status === 'RESOLVED';
  const assignedToOther =
    thread.assignedToId != null && thread.assignedToId !== myId;

  if (!thread.isStaff) return null;

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {!thread.assignedToId ? (
        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1 bg-white/60 text-xs dark:bg-black/20'
          onClick={() =>
            claimMutation.mutate(undefined, { onError: (e) => toast.error(e.message) })
          }
        >
          <UserCheck className='size-3.5' /> Claim
        </Button>
      ) : null}

      {thread.isManager && assignedToOther ? (
        <Button
          size='sm'
          variant='outline'
          className='h-7 gap-1 bg-white/60 text-xs dark:bg-black/20'
          onClick={() =>
            claimMutation.mutate(undefined, {
              onSuccess: () => toast.success('Took over conversation'),
              onError: (e) => toast.error(e.message)
            })
          }
        >
          <UserCheck className='size-3.5' /> Take over
        </Button>
      ) : null}

      {thread.isManager && staff.length > 0 ? (
        <Select
          value={thread.assignedToId != null ? String(thread.assignedToId) : undefined}
          onValueChange={(v) => {
            void reassignMutation.mutateAsync(
              { userId: Number(v) },
              {
                onSuccess: () => toast.success('Reassigned'),
                onError: (e) => toast.error(e.message)
              }
            );
          }}
        >
          <SelectTrigger className='h-7 w-[140px] bg-white/60 text-xs dark:bg-black/20'>
            <SelectValue placeholder='Reassign' />
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.userId} value={String(s.userId)}>
                {s.user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Button
        size='sm'
        variant='outline'
        className='h-7 gap-1 bg-white/60 text-xs dark:bg-black/20'
        onClick={() =>
          statusMutation.mutate(resolved ? 'OPEN' : 'RESOLVED', {
            onSuccess: () => toast.success(resolved ? 'Reopened' : 'Marked resolved'),
            onError: (e) => toast.error(e.message)
          })
        }
      >
        <CheckCircle2 className='size-3.5' /> {resolved ? 'Reopen' : 'Resolve'}
      </Button>
    </div>
  );
}
