'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type AcademicScope = {
  facultyId: string;
  departmentId: string;
  programId: string;
};

export const emptyAcademicScope: AcademicScope = {
  facultyId: '',
  departmentId: '',
  programId: '',
};

function readScope(params: URLSearchParams): AcademicScope {
  return {
    facultyId: params.get('facultyId') ?? '',
    departmentId: params.get('departmentId') ?? '',
    programId: params.get('programId') ?? '',
  };
}

function writeScope(scope: AcademicScope): URLSearchParams {
  const next = new URLSearchParams();
  if (scope.facultyId) next.set('facultyId', scope.facultyId);
  if (scope.departmentId) next.set('departmentId', scope.departmentId);
  if (scope.programId) next.set('programId', scope.programId);
  return next;
}

/** URL-backed Faculty → Department → Program scope for Super Admin lists. */
export function useAcademicScope() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scope = useMemo(
    () => readScope(searchParams ?? new URLSearchParams()),
    [searchParams]
  );

  const setScope = useCallback(
    (patch: Partial<AcademicScope>) => {
      const next: AcademicScope = { ...scope, ...patch };
      if (patch.facultyId !== undefined) {
        next.departmentId = '';
        next.programId = '';
      } else if (patch.departmentId !== undefined) {
        next.programId = '';
      }
      const qs = writeScope(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, scope]
  );

  const clearScope = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { scope, setScope, clearScope };
}
