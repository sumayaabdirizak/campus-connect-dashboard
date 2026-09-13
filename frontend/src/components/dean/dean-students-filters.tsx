'use client';

import { useMemo } from 'react';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useDepartments } from '@/lib/departments/queries';
import { useDeanBatches, useBatchSections } from '@/lib/dean/queries';
import type { DeanBatch } from '@/lib/dean/types';

export interface DeanStudentFilterState {
  departmentId: string;
  batchId: string;
  batchSectionId: string;
}

export const defaultDeanStudentFilters: DeanStudentFilterState = {
  departmentId: 'all',
  batchId: 'all',
  batchSectionId: 'all'
};

function parseBatches(raw: unknown): DeanBatch[] {
  if (Array.isArray(raw)) return raw as DeanBatch[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { batches?: DeanBatch[] }).batches)) {
    return (raw as { batches: DeanBatch[] }).batches;
  }
  return [];
}

const filterClass = 'h-9 w-auto min-w-[10rem] text-xs';

export function DeanStudentsFilters({
  filters,
  onChange,
  showBatch = true,
  showSection = true
}: {
  filters: DeanStudentFilterState;
  onChange: (next: DeanStudentFilterState) => void;
  showBatch?: boolean;
  showSection?: boolean;
}) {
  const { data: departmentsData } = useDepartments();
  const { data: batchesData } = useDeanBatches();

  const departments =
    departmentsData?.departments?.map((d) => ({ id: d.id, name: d.name, code: d.code })) ?? [];

  const allBatches = useMemo(() => parseBatches(batchesData), [batchesData]);

  const batches = useMemo(() => {
    if (filters.departmentId === 'all') return allBatches;
    const deptId = Number(filters.departmentId);
    return allBatches.filter((b) => b.program?.department?.id === deptId);
  }, [allBatches, filters.departmentId]);

  const batchIdNum = filters.batchId !== 'all' ? Number(filters.batchId) : 0;
  const { data: sectionsData } = useBatchSections(batchIdNum, batchIdNum > 0);

  const sections = useMemo(() => {
    const raw = sectionsData as { sections?: { id: number; name: string }[] } | undefined;
    return raw?.sections ?? [];
  }, [sectionsData]);

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      ...departments.map((d) => ({ value: String(d.id), label: d.name, sub: d.code }))
    ],
    [departments]
  );

  const batchOptions = useMemo(
    () => [
      { value: 'all', label: 'All batches' },
      ...batches.map((b) => ({
        value: String(b.id),
        label: b.name,
        sub: b.program?.name
      }))
    ],
    [batches]
  );

  const sectionOptions = useMemo(
    () => [
      { value: 'all', label: 'All sections' },
      ...sections.map((s) => ({ value: String(s.id), label: s.name }))
    ],
    [sections]
  );

  const set = (patch: Partial<DeanStudentFilterState>) => {
    const next = { ...filters, ...patch };
    if (patch.departmentId) {
      next.batchId = 'all';
      next.batchSectionId = 'all';
    }
    if (patch.batchId) {
      next.batchSectionId = 'all';
    }
    onChange(next);
  };

  return (
    <div className='flex shrink-0 flex-row flex-wrap items-center gap-2'>
      <SearchSelect
        options={departmentOptions}
        value={filters.departmentId}
        onValueChange={(v) => set({ departmentId: v })}
        placeholder='Department'
        searchPlaceholder='Search departments...'
        className={filterClass}
      />

      {showBatch ? (
        <SearchSelect
          options={batchOptions}
          value={filters.batchId}
          onValueChange={(v) => set({ batchId: v })}
          placeholder='Batch'
          searchPlaceholder='Search batches...'
          className={filterClass}
        />
      ) : null}

      {showSection ? (
        <SearchSelect
          options={sectionOptions}
          value={filters.batchSectionId}
          onValueChange={(v) => set({ batchSectionId: v })}
          placeholder='Section'
          searchPlaceholder='Search sections...'
          disabled={filters.batchId === 'all'}
          className={filterClass}
        />
      ) : null}
    </div>
  );
}
