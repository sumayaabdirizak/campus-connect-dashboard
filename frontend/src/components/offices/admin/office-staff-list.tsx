'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/features/ui/components/button';
import { useRemoveOfficeStaff } from '@/lib/offices/queries';
import type { OfficeStaffMember } from '@/lib/offices/types';

export function OfficeStaffList({
  officeId,
  staff,
  isLoading
}: {
  officeId: number;
  staff: OfficeStaffMember[];
  isLoading: boolean;
}) {
  const removeStaff = useRemoveOfficeStaff(officeId);

  if (isLoading) {
    return <p className='text-sm text-muted-foreground'>Loading…</p>;
  }
  if (staff.length === 0) {
    return (
      <p className='text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-sm'>
        No staff yet. Add someone below so they can reply in Messages.
      </p>
    );
  }
  return (
    <ul className='divide-y rounded-md border'>
      {staff.map((s) => (
        <li key={s.id} className='flex items-center justify-between gap-2 px-3 py-2.5 text-sm'>
          <div className='min-w-0'>
            <div className='truncate font-medium'>{s.user.full_name}</div>
            <div className='truncate text-xs text-muted-foreground'>{s.user.email}</div>
          </div>
          <div className='flex shrink-0 items-center gap-1.5'>
            <span className='bg-muted rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide'>
              {s.role}
            </span>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              className='text-destructive size-8'
              aria-label={`Remove ${s.user.full_name}`}
              disabled={removeStaff.isPending}
              onClick={() => {
                if (window.confirm(`Remove ${s.user.full_name} from this office?`)) {
                  void removeStaff.mutateAsync({ userId: s.userId });
                }
              }}
            >
              {removeStaff.isPending ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Trash2 className='size-3.5' />
              )}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
