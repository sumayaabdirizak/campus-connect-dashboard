'use client';

import { Badge } from '@/features/ui/components/badge';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { AdminBatch } from '@/lib/batches-admin/services';
import { BatchRowActions } from './batch-row-actions';

export function BatchTableRow({
  batch,
  col
}: {
  batch: AdminBatch;
  col: (id: string) => boolean;
}) {
  const inactive = batch.isGraduated || batch.status === 'INACTIVE';

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-[#3B82F6]'>#{batch.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{batch.name}</p>
        </PosTableCell>
      ) : null}
      {col('program') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{batch.program?.code ?? '—'}</span>
        </PosTableCell>
      ) : null}
      {col('intake') ? <PosTableCell>{batch.academicYear?.name ?? '—'}</PosTableCell> : null}
      {col('semester') ? (
        <PosTableCell>
          {batch.cohortSemester ?? batch.semester_number}
          {batch.maxSemesters ? ` / ${batch.maxSemesters}` : ''}
        </PosTableCell>
      ) : null}
      {col('status') ? (
        <PosTableCell>
          {inactive ? (
            <Badge
              variant='outline'
              className='gap-1.5 border-amber-200 bg-amber-50 text-amber-800'
            >
              <span className='size-1.5 rounded-full bg-amber-500' />
              Inactive
            </Badge>
          ) : (
            <Badge
              variant='outline'
              className='gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800'
            >
              <span className='size-1.5 rounded-full bg-emerald-500' />
              Active
            </Badge>
          )}
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <BatchRowActions batch={batch} />
      </PosTableCell>
    </PosTableRow>
  );
}
