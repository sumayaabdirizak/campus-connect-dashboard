'use client';

import { Badge } from '@/features/ui/components/badge';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { SupportOffice } from '@/lib/offices/types';
import { OfficeRowActions } from './office-row-actions';

export function OfficeTableRow({
  office,
  col,
  onManageStaff,
  onEdit
}: {
  office: SupportOffice;
  col: (id: string) => boolean;
  onManageStaff: (office: SupportOffice) => void;
  onEdit: (office: SupportOffice) => void;
}) {
  const active = office.isActive !== false;

  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{office.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{office.name}</p>
          {office.faculty ? (
            <p className='text-muted-foreground text-xs'>{office.faculty.name}</p>
          ) : (
            <p className='text-muted-foreground text-xs'>University</p>
          )}
        </PosTableCell>
      ) : null}
      {col('slug') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{office.slug}</span>
        </PosTableCell>
      ) : null}
      {col('prefix') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>{office.codePrefix}</span>
        </PosTableCell>
      ) : null}
      {col('status') ? (
        <PosTableCell>
          <Badge variant={active ? 'outline' : 'secondary'}>{active ? 'Active' : 'Inactive'}</Badge>
        </PosTableCell>
      ) : null}
      {col('description') ? (
        <PosTableCell>
          <span className='text-muted-foreground line-clamp-1 text-sm'>
            {office.description || '—'}
          </span>
        </PosTableCell>
      ) : null}
      {col('created') ? (
        <PosTableCell>
          <span className='text-muted-foreground'>
            {office.createdAt ? new Date(office.createdAt).toLocaleDateString() : '—'}
          </span>
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <OfficeRowActions office={office} onManageStaff={onManageStaff} onEdit={onEdit} />
      </PosTableCell>
    </PosTableRow>
  );
}
