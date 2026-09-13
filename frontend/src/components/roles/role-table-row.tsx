'use client';

import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { PlatformRole } from '@/lib/roles/types';

export function RoleTableRow({
  role,
  col
}: {
  role: PlatformRole;
  col: (id: string) => boolean;
}) {
  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{role.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{role.name}</p>
        </PosTableCell>
      ) : null}
      {col('users') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{role.userCount}</span>
        </PosTableCell>
      ) : null}
      {col('type') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>
            {role.isBuiltin ? 'Built-in' : 'Custom'}
          </span>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <span className='text-muted-foreground text-xs'>View only</span>
      </PosTableCell>
    </PosTableRow>
  );
}
