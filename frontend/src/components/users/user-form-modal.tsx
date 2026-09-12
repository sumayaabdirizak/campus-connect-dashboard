'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { handleApiError, showToast } from '@/lib/notifications';
import { useRegisterUser, useUpdateUser } from '@/lib/users/queries/mutations';
import { EMPTY_USER_FORM, type UserFormState } from '@/lib/users/services/user-form-state';
import { buildRegisterPayload } from '@/lib/users/services/build-register-payload';
import { isUserFormSubmitDisabled, validateUserForm } from '@/lib/users/services/user-form-validation';
import { useUserFormReferenceData } from '@/lib/users/services/use-user-form-reference-data';
import { UserFormIdentityFields } from './user-form-identity-fields';
import { UserFormStudentSection } from './user-form-student-section';

const FORM_ID = 'user-form-modal';

type EditUser = {
  id: number;
  full_name?: string;
  email?: string;
  number?: string;
  role?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: EditUser;
  defaultRole?: string;
  /** When true, role cannot be changed in the create form (page already chose Student/Lecturer/Dean). */
  lockRole?: boolean;
};

const CREATE_TITLES: Record<string, string> = {
  STUDENT: 'Add Student',
  TEACHER: 'Add Lecturer',
  DEAN: 'Add Dean'
};

const CREATE_SUBMIT: Record<string, string> = {
  STUDENT: 'Create Student',
  TEACHER: 'Create Lecturer',
  DEAN: 'Create Dean'
};

const ROLE_NOUN: Record<string, string> = {
  STUDENT: 'Student',
  TEACHER: 'Lecturer',
  DEAN: 'Dean'
};

export function UserFormModal({ open, onOpenChange, user, defaultRole, lockRole = false }: Props) {
  const isEdit = Boolean(user);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const createMutation = useRegisterUser();
  const updateMutation = useUpdateUser();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { sections, academicYears, departments, departmentsLoading, programs, batches, faculties } =
    useUserFormReferenceData(open);

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        value: d.code,
        label: `${d.name} (${d.code})`,
        sub: d.faculty?.name
      })),
    [departments]
  );

  const batchNamePreview = useMemo(() => {
    if (!form.batchId) return '';
    const batch = batches.find((b) => String(b.id) === form.batchId);
    return batch?.name?.trim() ?? '';
  }, [batches, form.batchId]);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...EMPTY_USER_FORM,
      full_name: user?.full_name || '',
      email: user?.email || '',
      number: user?.number || '',
      role: user?.role || defaultRole || 'STUDENT'
    });
  }, [open, user, defaultRole]);

  const patch = (next: Partial<UserFormState>) => setForm((f) => ({ ...f, ...next }));
  const onInput = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validateUserForm(form, isEdit);
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    if (isEdit && user) {
      updateMutation.mutate(
        {
          id: user.id,
          data: {
            full_name: form.full_name,
            email: form.email,
            number: form.number
          }
        },
        {
          onSuccess: () => {
            showToast('success', 'User updated');
            onOpenChange(false);
          },
          onError: (err: unknown) => handleApiError(err, 'Failed to update user')
        }
      );
      return;
    }

    createMutation.mutate(buildRegisterPayload(form), {
      onSuccess: (res: unknown) => {
        const created = res as { user?: { number?: string } };
        const id = created?.user?.number;
        showToast(
          'success',
          id
            ? `${ROLE_NOUN[form.role] ?? 'User'} created — University ID: ${id}`
            : `${ROLE_NOUN[form.role] ?? 'User'} created`
        );
        onOpenChange(false);
        setForm(EMPTY_USER_FORM);
      },
      onError: (err: unknown) => handleApiError(err, 'Failed to create user')
    });
  }

  const submitDisabled = isUserFormSubmitDisabled(form, isEdit);
  const createTitle = CREATE_TITLES[form.role] ?? 'Add User';
  const createSubmit = CREATE_SUBMIT[form.role] ?? 'Create User';

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit User' : createTitle}
      formId={FORM_ID}
      submitLabel={isEdit ? 'Save Changes' : createSubmit}
      submitIcon={isEdit ? 'check' : 'add'}
      submitting={isPending}
      submitDisabled={submitDisabled}
      className='sm:max-w-lg'
    >
      <form id={FORM_ID} onSubmit={onSubmit} className='space-y-4'>
        <UserFormIdentityFields
          form={form}
          isEdit={isEdit}
          lockRole={lockRole}
          departmentOptions={departmentOptions}
          departmentsLoading={departmentsLoading}
          batchNamePreview={batchNamePreview}
          onChange={patch}
          onInput={onInput}
        />

        {!isEdit && form.role === 'STUDENT' ? (
          <UserFormStudentSection
            form={form}
            onChange={patch}
            faculties={faculties}
            departments={departments}
            programs={programs}
            batches={batches as never}
            sections={sections}
            academicYears={academicYears as never}
          />
        ) : null}
      </form>
    </PosFormModal>
  );
}
