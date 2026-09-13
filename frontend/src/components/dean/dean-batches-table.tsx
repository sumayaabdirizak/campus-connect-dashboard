'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { PosTableCard } from '@/features/pos/components/pos-table-card';
import {
  PosTable,
  PosTableBody,
  PosTableHead,
  PosTableHeaderCell,
  PosTableCell,
  PosTableRow
} from '@/features/pos/components/pos-table';
import { Button } from '@/features/ui/components/button';
import {
  DeanHierarchyFilters,
  defaultDeanHierarchyFilters,
  type DeanHierarchyFilterState
} from '@/components/dean/dean-hierarchy-filters';
import { DeanAssignCourseSheet } from '@/components/dean/dean-assign-course-sheet';
import { useDeanBatches } from '@/lib/dean/queries';
import type { DeanBatch } from '@/lib/dean/types';

export function DeanBatchesTable() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DeanHierarchyFilterState>(defaultDeanHierarchyFilters);
  const [assignBatchId, setAssignBatchId] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data, isLoading, error } = useDeanBatches();

  const batches: DeanBatch[] = useMemo(() => {
    const raw = data as unknown;
    if (Array.isArray(raw)) return raw as DeanBatch[];
    if (raw && typeof raw === 'object' && Array.isArray((raw as { batches?: DeanBatch[] }).batches)) {
      return (raw as { batches: DeanBatch[] }).batches;
    }
    return [];
  }, [data]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      if (filters.departmentId !== 'all') {
        const deptId = b.program?.department?.id;
        if (String(deptId) !== filters.departmentId) return false;
      }
      if (filters.programId !== 'all') {
        if (String(b.program?.id) !== filters.programId) return false;
      }
      if (!deferredSearch) return true;
      return (
        b.name?.toLowerCase().includes(deferredSearch) ||
        b.program?.name?.toLowerCase().includes(deferredSearch) ||
        b.program?.department?.name?.toLowerCase().includes(deferredSearch)
      );
    });
  }, [batches, deferredSearch, filters]);

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
    <>
      <PosTableCard
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder='Search batches...'
        toolbarStart={
          <DeanHierarchyFilters filters={filters} onChange={setFilters} showProgram />
        }
      >
        {filtered.length === 0 ? (
          <div className='p-10 text-center'>
            <p className='font-medium'>
              {deferredSearch || filters.departmentId !== 'all' ? 'No matches' : 'No batches yet'}
            </p>
          </div>
        ) : (
          <PosTable>
            <PosTableHead>
              <tr>
                <PosTableHeaderCell>Batch</PosTableHeaderCell>
                <PosTableHeaderCell>Program</PosTableHeaderCell>
                <PosTableHeaderCell>Department</PosTableHeaderCell>
                <PosTableHeaderCell>Academic Year (cohort)</PosTableHeaderCell>
                <PosTableHeaderCell>Cohort semester</PosTableHeaderCell>
                <PosTableHeaderCell align='right'>Sections</PosTableHeaderCell>
                <PosTableHeaderCell align='right'>Action</PosTableHeaderCell>
              </tr>
            </PosTableHead>
            <PosTableBody>
              {filtered.map((batch) => (
                <PosTableRow key={batch.id}>
                  <PosTableCell>
                    <span className='font-medium'>{batch.name}</span>
                  </PosTableCell>
                  <PosTableCell>{batch.program?.name}</PosTableCell>
                  <PosTableCell>{batch.program?.department?.name}</PosTableCell>
                  <PosTableCell>
                    {batch.currentAcademicYearName ?? batch.academic_year}
                  </PosTableCell>
                  <PosTableCell>{batch.cohortSemester ?? batch.semester_number}</PosTableCell>
                  <PosTableCell align='right'>{batch._count?.sections ?? '—'}</PosTableCell>
                  <PosTableCell align='right'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      className='h-8'
                      onClick={() => setAssignBatchId(batch.id)}
                    >
                      Assign course
                    </Button>
                  </PosTableCell>
                </PosTableRow>
              ))}
            </PosTableBody>
          </PosTable>
        )}
      </PosTableCard>

      <DeanAssignCourseSheet
        open={assignBatchId != null}
        onOpenChange={(open) => {
          if (!open) setAssignBatchId(null);
        }}
        defaultBatchId={assignBatchId}
      />
    </>
  );
}

export default DeanBatchesTable;
