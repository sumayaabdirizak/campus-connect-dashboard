'use client';

import { Badge } from '@/features/ui/components/badge';
import {
  PosTableCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import type { User } from '@/lib/users/types';
import { UserRowActions } from './user-row-actions';

type Props = {
  user: User;
  col: (id: string) => boolean;
};

export function UserTableRow({ user, col }: Props) {
  const active = user.status?.toLowerCase() === 'active';

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{user.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium text-foreground'>{user.full_name}</p>
          <p className='text-xs text-muted-foreground'>{user.email}</p>
        </PosTableCell>
      ) : null}
      {col('number') ? (
        <PosTableCell>
          <span className='text-sm'>{user.number || '—'}</span>
        </PosTableCell>
      ) : null}
      {col('role') ? (
        <PosTableCell>
          <Badge
            variant='outline'
            className='border-primary/20 bg-primary/10 font-medium text-primary'
          >
            {user.role.replaceAll('_', ' ')}
          </Badge>
        </PosTableCell>
      ) : null}
      {col('status') ? (
        <PosTableCell>
          <Badge
            variant='outline'
            className={
              active
                ? 'border-success/20 bg-success-muted text-success'
                : 'border-border bg-muted text-muted-foreground'
            }
          >
            {user.status || 'Unknown'}
          </Badge>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <UserRowActions user={user} />
      </PosTableCell>
    </PosTableRow>
  );
}
