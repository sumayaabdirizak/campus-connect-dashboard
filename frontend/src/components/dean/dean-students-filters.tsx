'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDepartments } from '@/lib/departments/queries';
import { useDeanBatches, useBatchSections } from '@/lib/dean/queries';
import type { DeanBatch } from '@/lib/dean/types';
import { useMemo } from 'react';

export interface DeanStudentFilterState {
  departmentId: string;
  batchId: string;
  batchSectionId: string;
}

export const defaultDeanStudentFilters: DeanStudentFilterState = {
  departmentId: 'all',
  batchId: 'all',
  batchSectionId: 'all',
};

function parseBatches(raw: unknown): DeanBatch[] {
  if (Array.isArray(raw)) return raw as DeanBatch[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { batches?: DeanBatch[] }).batches)) {
    return (raw as { batches: DeanBatch[] }).batches;
  }
  return [];
}

export function DeanStudentsFilters({
  filters,
  onChange,
}: {
  filters: DeanStudentFilterState;
  onChange: (next: DeanStudentFilterState) => void;
}) {
  const { data: departmentsData } = useDepartments();
  const { data: batchesData } = useDeanBatches();

  const departments =
    departmentsData?.departments?.map((d) => ({ id: d.id, name: d.name })) ?? [];

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
      <div className='shrink-0'>
        <Select value={filters.departmentId} onValueChange={(v) => set({ departmentId: v })}>
          <SelectTrigger className='h-9 w-auto min-w-[10rem] text-xs'>
            <SelectValue placeholder='Department' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='shrink-0'>
        <Select value={filters.batchId} onValueChange={(v) => set({ batchId: v })}>
          <SelectTrigger className='h-9 w-auto min-w-[8rem] text-xs'>
            <SelectValue placeholder='Batch' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='shrink-0'>
        <Select
          value={filters.batchSectionId}
          onValueChange={(v) => set({ batchSectionId: v })}
          disabled={filters.batchId === 'all'}
        >
          <SelectTrigger className='h-9 w-auto min-w-[8rem] text-xs'>
            <SelectValue placeholder='Section' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
