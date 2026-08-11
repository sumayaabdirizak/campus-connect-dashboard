'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/features/ui/components/button';

export function OfficeStaffCandidateRow({
  fullName,
  email,
  platformRole,
  pending,
  onAdd
}: {
  fullName: string;
  email: string;
  platformRole?: string;
  pending: boolean;
  onAdd: () => void;
}) {
  return (
    <li className='flex items-center justify-between gap-2 rounded-md border px-2 py-1.5'>
      <div className='min-w-0 text-sm'>
        <div className='truncate font-medium'>{fullName}</div>
        <div className='truncate text-xs text-muted-foreground'>{email}</div>
        {platformRole ? (
          <div className='text-muted-foreground mt-0.5 text-[11px] uppercase tracking-wide'>
            {platformRole.replaceAll('_', ' ')}
          </div>
        ) : null}
      </div>
      <Button size='sm' variant='secondary' disabled={pending} className='gap-1' onClick={onAdd}>
        {pending ? <Loader2 className='size-3 animate-spin' /> : null}
        Add
      </Button>
    </li>
  );
}
