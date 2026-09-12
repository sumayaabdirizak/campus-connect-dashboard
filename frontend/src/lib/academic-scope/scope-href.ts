'use client';

/** Build a list URL with academic parent scope query params. */
export function academicScopeHref(
  path: string,
  scope: {
    facultyId?: string | number | null;
    departmentId?: string | number | null;
    programId?: string | number | null;
  }
): string {
  const qs = new URLSearchParams();
  if (scope.facultyId != null && String(scope.facultyId) !== '') {
    qs.set('facultyId', String(scope.facultyId));
  }
  if (scope.departmentId != null && String(scope.departmentId) !== '') {
    qs.set('departmentId', String(scope.departmentId));
  }
  if (scope.programId != null && String(scope.programId) !== '') {
    qs.set('programId', String(scope.programId));
  }
  const q = qs.toString();
  return q ? `${path}?${q}` : path;
}
