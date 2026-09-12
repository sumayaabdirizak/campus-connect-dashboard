'use client';

import Link from 'next/link';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { FacultyRow } from '@/lib/faculties/services/faculties-table-utils';
import { academicScopeHref } from '@/lib/academic-scope/scope-href';
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
          <Link
            href={academicScopeHref('/dashboard/departments', { facultyId: faculty.id })}
            className='text-sm font-medium text-primary hover:underline'
          >
            {faculty.name}
          </Link>
          <p className='mt-0.5 text-xs text-muted-foreground'>Next: departments</p>
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
        <PosTableCell>
          <Link
            href={`/dashboard/departments?facultyId=${faculty.id}`}
            className='text-sm font-medium text-primary hover:underline'
          >
            {faculty.departments?.length ?? 0}
          </Link>
        </PosTableCell>
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
