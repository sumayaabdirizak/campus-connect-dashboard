'use client';

import Link from 'next/link';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { Program } from '@/lib/programs/services';
import { academicScopeHref } from '@/lib/academic-scope/scope-href';
import { useAuthStore } from '@/lib/auth-store';
import { ProgramRowActions } from './program-row-actions';

export function ProgramTableRow({
  program,
  col
}: {
  program: Program;
  col: (id: string) => boolean;
}) {
  const role = useAuthStore((state) => state.user?.role);
  const years = program.durationYears ?? 4;
  const batchesPath = role === 'DEAN' ? '/dashboard/dean/batches' : '/dashboard/batches';
  const batchesHref = academicScopeHref(batchesPath, {
    facultyId: program.department?.faculty?.id,
    departmentId: program.departmentId,
    programId: program.id
  });

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{program.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <Link href={batchesHref} className='text-sm font-medium text-primary hover:underline'>
            {program.name}
          </Link>
          <p className='mt-0.5 text-xs text-muted-foreground'>Next: batches</p>
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
