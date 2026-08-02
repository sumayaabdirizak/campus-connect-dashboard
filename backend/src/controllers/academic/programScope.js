import { prisma } from '../../db/prisma.js';

export async function assertProgramInScope(programId, scope) {
  if (scope.mode === 'all') return { ok: true };
  if (scope.mode === 'none') {
    return { ok: false, status: 403, message: 'No faculty scope for this account' };
  }
  const program = await prisma.program.findUnique({
    where: { id: Number(programId) },
    select: { id: true, department: { select: { facultyId: true } } }
  });
  if (!program) return { ok: false, status: 404, message: 'Program not found' };
  if (Number(program.department.facultyId) !== Number(scope.facultyId)) {
    return { ok: false, status: 403, message: 'Forbidden' };
  }
  return { ok: true };
}

export async function assertDepartmentInScope(departmentId, scope) {
  if (scope.mode === 'all') return { ok: true };
  if (scope.mode === 'none') {
    return { ok: false, status: 403, message: 'No faculty scope for this account' };
  }
  const department = await prisma.department.findUnique({
    where: { id: Number(departmentId) },
    select: {
      id: true,
      facultyId: true,
      faculty: { select: { defaultDurationYears: true } }
    }
  });
  if (!department) return { ok: false, status: 400, message: 'Department not found' };
  if (Number(department.facultyId) !== Number(scope.facultyId)) {
    return { ok: false, status: 403, message: 'Department is outside your faculty' };
  }
  return { ok: true, department };
}
