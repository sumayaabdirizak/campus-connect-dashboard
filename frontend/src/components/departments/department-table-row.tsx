'use client';

import Link from 'next/link';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { Department } from '@/lib/departments/types';
import { programLevels } from '@/lib/departments/services/departments-table-utils';
import { academicScopeHref } from '@/lib/academic-scope/scope-href';
import { DepartmentRowActions } from './department-row-actions';

export function DepartmentTableRow({
  department,
  col
}: {
  department: Department;
  col: (id: string) => boolean;
}) {
  const levels = programLevels(department);
  const programsHref = academicScopeHref('/dashboard/programs', {
    facultyId: department.facultyId,
    departmentId: department.id
  });

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{department.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <Link href={programsHref} className='text-sm font-medium text-primary hover:underline'>
            {department.name}
          </Link>
          <p className='mt-0.5 text-xs text-muted-foreground'>Next: programs</p>
        </PosTableCell>
      ) : null}
      {col('code') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{department.code}</span>
        </PosTableCell>
      ) : null}
      {col('faculty') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{department.faculty?.name ?? '—'}</span>
        </PosTableCell>
      ) : null}
      {col('levels') ? (
        <PosTableCell>
          {levels.length > 0
            ? levels.map((l) => l.replace('_', ' ')).join(', ')
            : '—'}
        </PosTableCell>
      ) : null}
      {col('created') ? (
        <PosTableCell>
          <span className='text-muted-foreground'>
            {department.created_at ? new Date(department.created_at).toLocaleDateString() : '—'}
          </span>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <DepartmentRowActions department={department} />
      </PosTableCell>
    </PosTableRow>
  );
}
