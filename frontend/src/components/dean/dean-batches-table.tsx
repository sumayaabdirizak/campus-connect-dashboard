'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell
} from '@/features/pos/components/pos-table';
import { useDeanBatches } from '@/lib/dean/queries';
import type { DeanBatch } from '@/lib/dean/types';

export function DeanBatchesTable() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data, isLoading, error } = useDeanBatches();

  const batches: DeanBatch[] = useMemo(() => {
    const raw = data as unknown;
    if (Array.isArray(raw)) return raw as DeanBatch[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).batches)) {
      return (raw as any).batches as DeanBatch[];
    }
    return [];
  }, [data]);

  const filtered = useMemo(() => {
    if (!deferredSearch) return batches;
    return batches.filter(
      (b) =>
        b.name?.toLowerCase().includes(deferredSearch) ||
        b.program?.name?.toLowerCase().includes(deferredSearch)
    );
  }, [batches, deferredSearch]);

  if (isLoading && !data) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border bg-card'>
        <div className='size-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-destructive'>
        Failed to load batches: {(error as Error).message}
      </div>
    );
  }

  return (
    <PosTableCard search={search} onSearchChange={setSearch} searchPlaceholder='Search batches...'>
      {filtered.length === 0 ? (
        <div className='p-10 text-center'>
          <p className='font-medium'>{deferredSearch ? 'No matches' : 'No batches yet'}</p>
        </div>
      ) : (
        <PosTable>
          <PosTableHead>
            <tr>
              <PosTableHeaderCell>Batch</PosTableHeaderCell>
              <PosTableHeaderCell>Program</PosTableHeaderCell>
              <PosTableHeaderCell>Department</PosTableHeaderCell>
              <PosTableHeaderCell>Academic Year</PosTableHeaderCell>
              <PosTableHeaderCell>Semester</PosTableHeaderCell>
              <PosTableHeaderCell align='right'>Sections</PosTableHeaderCell>
            </tr>
          </PosTableHead>
          <PosTableBody>
            {filtered.map((batch) => (
              <tr key={batch.id} className='border-b last:border-0'>
                <td className='px-4 py-3 text-sm font-medium'>{batch.name}</td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>{batch.program?.name}</td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>
                  {batch.program?.department?.name}
                </td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>
                  {batch.academicYear?.name ?? batch.academic_year}
                </td>
                <td className='px-4 py-3 text-sm text-muted-foreground'>{batch.semester_number}</td>
                <td className='px-4 py-3 text-right text-sm tabular-nums'>
                  {batch._count?.sections ?? batch.sections?.length ?? 0}
                </td>
              </tr>
            ))}
          </PosTableBody>
        </PosTable>
      )}
    </PosTableCard>
  );
}

export default DeanBatchesTable;
