'use client';

import { formatDistanceToNow } from 'date-fns';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import { ACTIVE_MS, type RosterRow } from './helpers';
import { StudentNameCell } from './student-name-cell';

interface RosterListRowProps {
  row: RosterRow;
  onRowClick?: (row: RosterRow) => void;
}

export function RosterListRow({ row, onRowClick }: RosterListRowProps) {
  const ts = row.lastSeenAt;

  return (
    <PosTableRow
      className='cursor-pointer'
      onClick={() => onRowClick?.(row)}
    >
      <PosTableCell className='min-w-[240px] max-w-[420px] whitespace-normal'>
        <StudentNameCell name={row.full_name} />
      </PosTableCell>
      <PosTableCell>
        <span className='text-sm tabular-nums text-muted-foreground'>{row.number}</span>
      </PosTableCell>
      <PosTableCell className='whitespace-normal'>
        {!ts ? (
          <span className='inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
            Never
          </span>
        ) : (
          <div className='flex flex-col gap-1'>
            <span className='text-sm' title={new Date(ts).toLocaleString()}>
              {formatDistanceToNow(new Date(ts), { addSuffix: true })}
            </span>
            {Date.now() - new Date(ts).getTime() <= ACTIVE_MS ? (
              <span className='inline-flex w-fit rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700'>
                Active
              </span>
            ) : null}
          </div>
        )}
      </PosTableCell>
    </PosTableRow>
  );
}
