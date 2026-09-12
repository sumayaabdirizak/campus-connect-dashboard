'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useQuery } from '@/lib/async-query';
import { facultiesQueryOptions } from '@/lib/faculties/queries';
import { normalizeFacultiesList } from '@/lib/faculties/services';
import { useDepartments } from '@/lib/departments/queries';
import { usePrograms } from '@/lib/programs/queries';
import type { AcademicScope } from '@/lib/academic-scope/use-academic-scope';
import { academicScopeHref } from '@/lib/academic-scope/scope-href';

export type AcademicBreadcrumbCurrent =
  | 'departments'
  | 'programs'
  | 'batches'
  | 'courses'
  | 'batch-detail';

const NEXT_HINT: Record<AcademicBreadcrumbCurrent, string> = {
  departments: 'Next: open a department → Programs',
  programs: 'Next: open a program → Batches',
  batches: 'Next: open a batch → Students & course offerings',
  courses: 'Catalogue courses — Dean assigns offerings to batch sections',
  'batch-detail': 'Offerings appear after a Dean assigns courses to sections'
};

/**
 * Smooth drill trail: Faculties → Faculty → Department → Program → current page.
 */
export function AcademicScopeBreadcrumb({
  scope,
  current
}: {
  scope: AcademicScope;
  current: AcademicBreadcrumbCurrent;
}) {
  const { data: facultiesData } = useQuery({
    ...facultiesQueryOptions({ limit: 200 }),
    enabled: !!scope.facultyId
  });
  const faculties = normalizeFacultiesList(facultiesData);
  const facultyName =
    faculties.find((f) => String(f.id) === scope.facultyId)?.name ??
    (scope.facultyId ? `Faculty #${scope.facultyId}` : null);

  const { data: departmentsData } = useDepartments(
    scope.facultyId ? { facultyId: scope.facultyId } : undefined
  );
  const departmentName =
    departmentsData?.departments?.find((d) => String(d.id) === scope.departmentId)
      ?.name ??
    (scope.departmentId ? `Department #${scope.departmentId}` : null);

  const { data: programsData } = usePrograms({
    facultyId: scope.facultyId || undefined,
    departmentId: scope.departmentId || undefined
  });
  const programName =
    programsData?.programs?.find((p) => String(p.id) === scope.programId)?.name ??
    (scope.programId ? `Program #${scope.programId}` : null);

  const hasScope = !!(scope.facultyId || scope.departmentId || scope.programId);

  if (!hasScope) {
    return (
      <p className='mb-3 text-sm text-muted-foreground'>
        Workflow: Faculty → Department → Program → Batch → offerings. Click a row name to
        continue.
      </p>
    );
  }

  const crumbs: { label: string; href: string }[] = [
    { label: 'Faculties', href: '/dashboard/faculties' }
  ];

  if (scope.facultyId && facultyName) {
    crumbs.push({
      label: facultyName,
      href: academicScopeHref('/dashboard/departments', { facultyId: scope.facultyId })
    });
  }

  if (scope.departmentId && departmentName) {
    crumbs.push({
      label: departmentName,
      href: academicScopeHref('/dashboard/programs', {
        facultyId: scope.facultyId,
        departmentId: scope.departmentId
      })
    });
  }

  if (scope.programId && programName) {
    crumbs.push({
      label: programName,
      href: academicScopeHref('/dashboard/batches', {
        facultyId: scope.facultyId,
        departmentId: scope.departmentId,
        programId: scope.programId
      })
    });
  }

  const currentLabel =
    current === 'departments'
      ? 'Departments'
      : current === 'programs'
        ? 'Programs'
        : current === 'batches'
          ? 'Batches'
          : current === 'courses'
            ? 'Courses'
            : 'Batch';

  return (
    <div className='mb-3 space-y-1'>
      <nav
        aria-label='Academic scope'
        className='flex flex-wrap items-center gap-1 text-sm text-muted-foreground'
      >
        {crumbs.map((c, i) => (
          <span key={`${c.href}-${c.label}-${i}`} className='inline-flex items-center gap-1'>
            <Link href={c.href} className='hover:text-foreground hover:underline'>
              {c.label}
            </Link>
            <ChevronRight className='size-3.5 shrink-0 opacity-60' aria-hidden />
          </span>
        ))}
        <span className='font-medium text-foreground'>{currentLabel}</span>
      </nav>
      <p className='text-xs text-muted-foreground'>{NEXT_HINT[current]}</p>
    </div>
  );
}
