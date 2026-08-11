'use client';

import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { Program } from '@/lib/programs/services';
import { ProgramRowActions } from './program-row-actions';

export function ProgramTableRow({
  program,
  col
}: {
  program: Program;
  col: (id: string) => boolean;
}) {
  const years = program.durationYears ?? 4;

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-[#3B82F6]'>#{program.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{program.name}</p>
        </PosTableCell>
      ) : null}
      {col('code') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{program.code}</span>
        </PosTableCell>
      ) : null}
      {col('level') ? <PosTableCell>{program.level.replace('_', ' ')}</PosTableCell> : null}
      {col('duration') ? (
        <PosTableCell>
          {years}y / {years * 2}sem
        </PosTableCell>
      ) : null}
      {col('department') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{program.department?.name ?? '—'}</span>
        </PosTableCell>
      ) : null}
      {col('created') ? (
        <PosTableCell>
          <span className='text-muted-foreground'>
            {program.created_at ? new Date(program.created_at).toLocaleDateString() : '—'}
          </span>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <ProgramRowActions program={program} />
      </PosTableCell>
    </PosTableRow>
  );
}
