'use client';

import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { FacultyRow } from '@/lib/faculties/services/faculties-table-utils';
import { FacultyRowActions } from './faculty-row-actions';

export function FacultyTableRow({
  faculty,
  col
}: {
  faculty: FacultyRow;
  col: (id: string) => boolean;
}) {
  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{faculty.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{faculty.name}</p>
        </PosTableCell>
      ) : null}
      {col('code') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{faculty.code}</span>
        </PosTableCell>
      ) : null}
      {col('duration') ? (
        <PosTableCell>{faculty.defaultDurationYears ?? 4} yrs</PosTableCell>
      ) : null}
      {col('departments') ? (
        <PosTableCell>{faculty.departments?.length ?? 0}</PosTableCell>
      ) : null}
      {col('created') ? (
        <PosTableCell>
          <span className='text-muted-foreground'>
            {faculty.created_at ? new Date(faculty.created_at).toLocaleDateString() : '—'}
          </span>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <FacultyRowActions faculty={faculty} />
      </PosTableCell>
    </PosTableRow>
  );
}
