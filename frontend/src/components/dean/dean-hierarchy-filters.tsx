'use client';

import { useMemo } from 'react';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useDepartments } from '@/lib/departments/queries';
import { usePrograms } from '@/lib/programs/queries';

export type DeanHierarchyFilterState = {
  departmentId: string;
  programId: string;
};

export const defaultDeanHierarchyFilters: DeanHierarchyFilterState = {
  departmentId: 'all',
  programId: 'all'
};

const filterClass = 'h-9 w-auto min-w-[10rem] text-xs';

export function DeanHierarchyFilters({
  filters,
  onChange,
  showProgram = false
}: {
  filters: DeanHierarchyFilterState;
  onChange: (next: DeanHierarchyFilterState) => void;
  showProgram?: boolean;
}) {
  const { data: departmentsData } = useDepartments();
  const departments = departmentsData?.departments ?? [];

  const { data: programsData } = usePrograms(
    filters.departmentId !== 'all' ? { departmentId: filters.departmentId } : undefined
  );
  const programs = programsData?.programs ?? [];

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      ...departments.map((d) => ({ value: String(d.id), label: d.name, sub: d.code }))
    ],
    [departments]
  );

  const programOptions = useMemo(
    () => [
      { value: 'all', label: 'All programs' },
      ...programs.map((p) => ({ value: String(p.id), label: p.name, sub: p.code }))
    ],
    [programs]
  );

  return (
    <div className='flex shrink-0 flex-row flex-wrap items-center gap-2'>
      <SearchSelect
        options={departmentOptions}
        value={filters.departmentId}
        onValueChange={(v) => onChange({ ...filters, departmentId: v, programId: 'all' })}
        placeholder='Department'
        searchPlaceholder='Search departments...'
        emptyText='No departments found.'
        className={filterClass}
      />

      {showProgram ? (
        <SearchSelect
          options={programOptions}
          value={filters.programId}
          onValueChange={(v) => onChange({ ...filters, programId: v })}
          placeholder='Program'
          searchPlaceholder='Search programs...'
          emptyText='No programs found.'
          className={filterClass}
        />
      ) : null}
    </div>
  );
}
