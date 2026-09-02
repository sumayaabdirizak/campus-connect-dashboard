import type { UserFormState } from './user-form-state';

export function buildRegisterPayload(form: UserFormState) {
  const payload: Record<string, unknown> = {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    password: form.password,
    role: form.role
  };

  if (form.role === 'DEAN' && form.facultyId) {
    payload.facultyId = Number(form.facultyId);
  }

  if (['STUDENT', 'TEACHER'].includes(form.role) && form.departmentCode) {
    payload.departmentCode = form.departmentCode;
  }

  if (form.role === 'TEACHER' && form.secondaryFacultyId) {
    payload.secondaryFacultyId = Number(form.secondaryFacultyId);
  }

  if (form.programId) payload.programId = Number(form.programId);
  if (form.batchSectionId) payload.batchSectionId = Number(form.batchSectionId);
  if (form.academicYearId) payload.academicYearId = Number(form.academicYearId);
  if (form.semesterId) payload.semesterId = Number(form.semesterId);

  const courseIds = form.courseIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (courseIds.length > 0) payload.courseIds = courseIds;

  return payload;
}
