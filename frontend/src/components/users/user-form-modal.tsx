'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { handleApiError, showToast } from '@/lib/notifications';
import { useRegisterUser, useUpdateUser } from '@/lib/users/queries/mutations';
import { EMPTY_USER_FORM, roleRequiresOffice, type UserFormState } from '@/lib/users/services/user-form-state';
import { buildRegisterPayload } from '@/lib/users/services/build-register-payload';
import { isUserFormSubmitDisabled, validateUserForm } from '@/lib/users/services/user-form-validation';
import { useUserFormReferenceData } from '@/lib/users/services/use-user-form-reference-data';
import { UserFormIdentityFields } from './user-form-identity-fields';
import { UserFormOfficeFields } from './user-form-office-fields';
import { UserFormStudentSection } from './user-form-student-section';

const FORM_ID = 'user-form-modal';

type EditUser = {
  id: number;
  full_name?: string;
  email?: string;
  number?: string;
  role?: string;
  officeId?: number | null;
  officeStaffRole?: 'AGENT' | 'MANAGER';
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: EditUser;
};

export function UserFormModal({ open, onOpenChange, user }: Props) {
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
      role: user?.role || 'STUDENT',
      officeId: user?.officeId != null ? String(user.officeId) : '',
      officeStaffRole: user?.officeStaffRole || 'AGENT'
    });
  }, [open, user]);

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
      const canAssignOffice = form.role !== 'STUDENT';
      updateMutation.mutate(
        {
          id: user.id,
          data: {
            full_name: form.full_name,
            email: form.email,
            number: form.number,
            ...(canAssignOffice
              ? {
                  officeId: form.officeId ? Number(form.officeId) : null,
                  officeStaffRole: form.officeStaffRole
                }
              : {})
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
        const created = res as {
          user?: {
            number?: string;
            officeStaff?: { office?: { name?: string }; role?: string } | null;
          };
        };
        const id = created?.user?.number;
        const officeName = created?.user?.officeStaff?.office?.name;
        const parts = [
          id ? `University ID: ${id}` : null,
          officeName ? `Office: ${officeName}` : null
        ].filter(Boolean);
        showToast(
          'success',
          parts.length ? `User created — ${parts.join(' · ')}` : 'User created'
        );
        onOpenChange(false);
        setForm(EMPTY_USER_FORM);
      },
      onError: (err: unknown) => handleApiError(err, 'Failed to create user')
    });
  }

  const submitDisabled = isUserFormSubmitDisabled(form, isEdit);

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit User' : 'Add User'}
      formId={FORM_ID}
      submitLabel={isEdit ? 'Save Changes' : 'Create User'}
      submitIcon={isEdit ? 'check' : 'add'}
      submitting={isPending}
      submitDisabled={submitDisabled}
      className='sm:max-w-lg'
    >
      <form id={FORM_ID} onSubmit={onSubmit} className='space-y-4'>
        <UserFormIdentityFields
          form={form}
          isEdit={isEdit}
          departmentOptions={departmentOptions}
          departmentsLoading={departmentsLoading}
          batchNamePreview={batchNamePreview}
          faculties={faculties}
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

        {roleRequiresOffice(form.role) ? (
          <UserFormOfficeFields form={form} onChange={patch} />
        ) : null}
      </form>
    </PosFormModal>
  );
}
