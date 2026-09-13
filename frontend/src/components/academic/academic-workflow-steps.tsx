'use client';

import Link from 'next/link';
import { academicScopeHref } from '@/lib/academic-scope/scope-href';
import type { AcademicScope } from '@/lib/academic-scope/use-academic-scope';

/** Compact next-step strip under page headers for the Faculty→Offering workflow. */
export function AcademicWorkflowSteps({
  scope,
  active
}: {
  scope?: AcademicScope;
  active: 'faculties' | 'departments' | 'programs' | 'batches' | 'courses';
}) {
  const s = scope ?? { facultyId: '', departmentId: '', programId: '' };

  const steps: { id: typeof active; label: string; href: string }[] = [
    { id: 'faculties', label: '1. Faculty', href: '/dashboard/faculties' },
    {
      id: 'departments',
      label: '2. Department',
      href: academicScopeHref('/dashboard/departments', { facultyId: s.facultyId })
    },
    {
      id: 'programs',
      label: '3. Program',
      href: academicScopeHref('/dashboard/programs', {
        facultyId: s.facultyId,
        departmentId: s.departmentId
      })
    },
    {
      id: 'batches',
      label: '4. Batch',
      href: academicScopeHref('/dashboard/batches', {
        facultyId: s.facultyId,
        departmentId: s.departmentId,
        programId: s.programId
      })
    },
    {
      id: 'courses',
      label: '5. Courses',
      href: academicScopeHref('/dashboard/courses', {
        facultyId: s.facultyId,
        departmentId: s.departmentId
      })
    }
  ];

  return (
    <ol className='mb-3 flex flex-wrap items-center gap-1.5 text-xs'>
      {steps.map((step, index) => {
        const isActive = step.id === active;
        return (
          <li key={step.id} className='inline-flex items-center gap-1.5'>
            {index > 0 ? <span className='text-muted-foreground/50'>→</span> : null}
            <Link
              href={step.href}
              className={
                isActive
                  ? 'rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary'
                  : 'rounded-full px-2.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            >
              {step.label}
            </Link>
          </li>
        );
      })}
      <li className='inline-flex items-center gap-1.5 text-muted-foreground'>
        <span className='text-muted-foreground/50'>→</span>
        <span className='px-1'>Offering (Dean assigns)</span>
      </li>
    </ol>
  );
}
