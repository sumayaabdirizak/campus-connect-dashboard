'use client';

import { Badge } from '@/features/ui/components/badge';
import { PosTableCell, PosTableRow } from '@/features/pos/components/pos-table';
import type { AdminAcademicYear } from '@/lib/academic-years-admin/services';
import { formatDisplayDate } from '@/lib/academic-years-admin/services/format-dates';
import { AcademicYearRowActions } from './academic-year-row-actions';

export function AcademicYearTableRow({
  year,
  col
}: {
  year: AdminAcademicYear;
  col: (id: string) => boolean;
}) {
  return (
    <PosTableRow>
      {col('id') ? (
        <PosTableCell>
          <span className='font-medium text-primary'>#{year.id}</span>
        </PosTableCell>
      ) : null}
      {col('name') ? (
        <PosTableCell>
          <p className='text-sm font-medium'>{year.name}</p>
          {year.activeSemester ? (
            <p className='text-muted-foreground text-xs'>
              Active: Global #{year.activeSemester.sequence}
            </p>
          ) : null}
        </PosTableCell>
      ) : null}
      {col('dates') ? (
        <PosTableCell>
          <span className='text-muted-foreground text-sm'>
            {formatDisplayDate(year.start_date)} – {formatDisplayDate(year.end_date)}
          </span>
        </PosTableCell>
      ) : null}
      {col('semesters') ? <PosTableCell>{year.semesters?.length ?? 0}</PosTableCell> : null}
      {col('batches') ? <PosTableCell>{year.batches?.length ?? 0}</PosTableCell> : null}
      {col('status') ? (
        <PosTableCell>
          {year.inActiveWindow ? (
            <Badge
              variant='outline'
              className='gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-800'
            >
              <span className='size-1.5 rounded-full bg-emerald-500' />
              Active
            </Badge>
          ) : (
            <Badge
              variant='outline'
              className='gap-1.5 border-amber-200 bg-amber-50 text-amber-800'
            >
              <span className='size-1.5 rounded-full bg-amber-500' />
              History
            </Badge>
          )}
        </PosTableCell>
      ) : null}
      <PosTableCell align='right'>
        <AcademicYearRowActions year={year} />
      </PosTableCell>
    </PosTableRow>
  );
}
