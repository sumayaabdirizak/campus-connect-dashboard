'use client';

import { Icons } from '@/components/icons';
import type { DiscussionOverwriteTarget } from '../../../../api/types';

interface PermissionsEmptyStateProps {
  kind: DiscussionOverwriteTarget;
  picker: React.ReactNode;
}

export function PermissionsEmptyState({ kind, picker }: PermissionsEmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-10 text-center'>
      <div className='rounded-full bg-muted p-3'>
        <Icons.lock className='h-5 w-5 text-muted-foreground' />
      </div>
      <div className='space-y-1'>
        <p className='text-sm font-medium'>
          No {kind === 'ROLE' ? 'role' : 'member'} overwrites
        </p>
        <p className='mx-auto max-w-sm text-xs text-muted-foreground'>
          This channel inherits from server-wide role defaults. Add an overwrite to grant
          or restrict access for a specific {kind === 'ROLE' ? 'role' : 'member'}.
        </p>
      </div>
      <div>{picker}</div>
    </div>
  );
}
