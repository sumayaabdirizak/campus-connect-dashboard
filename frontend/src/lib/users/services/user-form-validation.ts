import { type UserFormState } from './user-form-state';

export function validateUserForm(form: UserFormState, isEdit: boolean): string | null {
  if (!form.full_name.trim()) {
    return 'Full name is required';
  }
  if (!isEdit && form.password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (!isEdit && form.role === 'STUDENT') {
    if (!form.facultyId || !form.departmentId || !form.programId) {
      return 'Select faculty, department, and program';
    }
    if (!form.batchId || !form.batchSectionId) {
      return 'Select batch and section';
    }
    if (!form.academicYearId || !form.semesterId) {
      return 'Could not resolve academic year / semester';
    }
  }

  return null;
}

export function isUserFormSubmitDisabled(form: UserFormState, isEdit: boolean): boolean {
  if (isEdit) return false;
  if (form.role === 'DEAN' && !form.facultyId) return true;
  if (form.role === 'TEACHER' && !form.departmentCode) return true;
  if (
    form.role === 'STUDENT' &&
    (!form.facultyId ||
      !form.departmentId ||
      !form.programId ||
      !form.batchSectionId ||
      !form.academicYearId ||
      !form.semesterId)
  ) {
    return true;
  }
  return false;
}
