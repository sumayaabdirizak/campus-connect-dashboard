import { useMemo } from 'react';
import { Badge } from '@/features/ui/components/badge';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import { ACTIVE_MS, type RosterRow } from './helpers';
import { StudentNameCell } from './student-name-cell';

export function useRosterColumns() {
  return useMemo<ColumnDef<RosterRow, unknown>[]>(
    () => [
      {
        id: 'full_name',
        accessorKey: 'full_name',
        header: 'Student',
        cell: ({ row }) => (
          <StudentNameCell name={row.original.full_name} number={row.original.number} />
        )
      },
      {
        id: 'number',
        accessorKey: 'number',
        header: 'Student ID',
        cell: ({ row }) => (
          <span className='text-sm tabular-nums text-muted-foreground'>{row.original.number}</span>
        )
      },
      {
        id: 'lastSeenAt',
        accessorKey: 'lastSeenAt',
        header: 'Last seen',
        sortingFn: (a, b) => {
          const av = a.original.lastSeenAt ? new Date(a.original.lastSeenAt).getTime() : 0;
          const bv = b.original.lastSeenAt ? new Date(b.original.lastSeenAt).getTime() : 0;
          return av - bv;
        },
        cell: ({ row }) => {
          const ts = row.original.lastSeenAt;
          if (!ts) {
            return (
              <Badge variant='secondary' className='font-normal'>
                Never
              </Badge>
            );
          }
          const recent = Date.now() - new Date(ts).getTime() <= ACTIVE_MS;
          return (
            <div className='flex flex-col gap-0.5'>
              <span className='text-sm' title={new Date(ts).toLocaleString()}>
                {formatDistanceToNow(new Date(ts), { addSuffix: true })}
              </span>
              {recent ? (
                <Badge variant='outline' className='w-fit text-[10px] text-emerald-700'>
                  Active
                </Badge>
              ) : null}
            </div>
          );
        }
      }
    ],
    []
  );
}
