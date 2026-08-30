'use client';

import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { Department } from '@/lib/departments/types';
import { programLevels } from '@/lib/departments/services/departments-table-utils';
import { DepartmentRowActions } from './department-row-actions';

export function DepartmentTableRow({
  department,
  col
}: {
  department: Department;
  col: (id: string) => boolean;
}) {
  const levels = programLevels(department);

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{department.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{department.name}</p>
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
