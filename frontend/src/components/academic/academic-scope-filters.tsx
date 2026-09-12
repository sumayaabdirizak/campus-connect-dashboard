'use client';

import { useMemo } from 'react';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useQuery } from '@/lib/async-query';
import { useAcademicScope } from '@/lib/academic-scope/use-academic-scope';
import { facultiesQueryOptions } from '@/lib/faculties/queries';
import { normalizeFacultiesList } from '@/lib/faculties/services';
import { useDepartments } from '@/lib/departments/queries';
import { usePrograms } from '@/lib/programs/queries';

type Props = {
  showFaculty?: boolean;
  showDepartment?: boolean;
  showProgram?: boolean;
};

const filterClass = 'h-9 w-auto min-w-[10rem] text-xs';

export function AcademicScopeFilters({
  showFaculty = true,
  showDepartment = true,
  showProgram = true
}: Props) {
  const { scope, setScope } = useAcademicScope();

  const { data: facultiesData } = useQuery(facultiesQueryOptions({ limit: 200 }));
  const faculties = normalizeFacultiesList(facultiesData);

  const { data: departmentsData } = useDepartments(
    scope.facultyId ? { facultyId: scope.facultyId } : undefined
  );
  const departments = departmentsData?.departments ?? [];

  const { data: programsData } = usePrograms({
    facultyId: scope.facultyId || undefined,
    departmentId: scope.departmentId || undefined
  });
  const programs = programsData?.programs ?? [];

  const facultyOptions = useMemo(
    () => [
      { value: 'all', label: 'All faculties' },
      ...faculties.map((f) => ({ value: String(f.id), label: f.name, sub: f.code }))
    ],
    [faculties]
  );

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
      {showFaculty ? (
        <SearchSelect
          options={facultyOptions}
          value={scope.facultyId || 'all'}
          onValueChange={(v) => setScope({ facultyId: v === 'all' ? '' : v })}
          placeholder='Faculty'
          searchPlaceholder='Search faculties...'
          emptyText='No faculties found.'
          className={filterClass}
        />
      ) : null}

      {showDepartment ? (
        <SearchSelect
          options={departmentOptions}
          value={scope.departmentId || 'all'}
          onValueChange={(v) => setScope({ departmentId: v === 'all' ? '' : v })}
          placeholder='Department'
          searchPlaceholder='Search departments...'
          emptyText='No departments found.'
          className={filterClass}
        />
      ) : null}

      {showProgram ? (
        <SearchSelect
          options={programOptions}
          value={scope.programId || 'all'}
          onValueChange={(v) => setScope({ programId: v === 'all' ? '' : v })}
          placeholder='Program'
          searchPlaceholder='Search programs...'
          emptyText='No programs found.'
          className={filterClass}
        />
      ) : null}
    </div>
  );
}
