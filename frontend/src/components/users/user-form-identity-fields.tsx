'use client';

import { useMemo } from 'react';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useRoles } from '@/lib/roles/queries';
import { DeanFacultySearchSelect } from './dean-faculty-search-select';
import { UserFormRoleSelect } from './user-form-role-select';
import { UserFormUniversityIdField } from './user-form-university-id-field';
import { CREATE_ROLES, type UserFormState } from '@/lib/users/services/user-form-state';

type DeptOption = { value: string; label: string; sub?: string };

type Props = {
  form: UserFormState;
  isEdit: boolean;
  lockRole?: boolean;
  departmentOptions: DeptOption[];
  departmentsLoading?: boolean;
  batchNamePreview?: string;
  onChange: (patch: Partial<UserFormState>) => void;
  onInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  TEACHER: 'Lecturer',
  DEAN: 'Dean'
};

export function UserFormIdentityFields({
  form,
  isEdit,
  lockRole = false,
  departmentOptions,
  departmentsLoading,
  batchNamePreview,
  onChange,
  onInput
}: Props) {
  const { data: apiRoles } = useRoles();
  const roleOptions =
    apiRoles && apiRoles.length > 0 ? apiRoles.map((r) => r.name) : [...CREATE_ROLES];
  /** Students pick department in enrollment cascade. */
  const needsDepartment = form.role === 'TEACHER';

  const primaryFacultyName = useMemo(
    () => departmentOptions.find((d) => d.value === form.departmentCode)?.sub,
    [departmentOptions, form.departmentCode]
  );

  return (
    <div className='space-y-3'>
      <div className='space-y-1.5'>
        <Label htmlFor='full_name'>
          Full name <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='full_name'
          name='full_name'
          value={form.full_name}
          onChange={onInput}
          placeholder='e.g. Amina Hassan'
          required
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='email'>
          Email <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='email'
          name='email'
          type='email'
          value={form.email}
          onChange={onInput}
          placeholder='amina@jazeera.edu.so'
          required
        />
      </div>

      <UserFormUniversityIdField
        isEdit={isEdit}
        role={form.role}
        number={form.number}
        batchNamePreview={batchNamePreview}
        departmentCode={form.departmentCode}
        onInput={onInput}
      />

      {!isEdit ? (
        <div className='space-y-1.5'>
          <Label htmlFor='password'>
            Temporary password <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='password'
            name='password'
            type='password'
            value={form.password}
            onChange={onInput}
            placeholder='••••••••'
            required
            minLength={8}
          />
        </div>
      ) : null}

      {!isEdit ? (
        lockRole ? (
          <div className='space-y-1.5'>
            <Label>Role</Label>
            <div className='flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm text-foreground'>
              {ROLE_LABELS[form.role] ?? form.role.replaceAll('_', ' ')}
            </div>
          </div>
        ) : (
          <UserFormRoleSelect role={form.role} roleOptions={roleOptions} onChange={onChange} />
        )
      ) : null}

      {!isEdit && form.role === 'DEAN' ? (
        <DeanFacultySearchSelect
          value={form.facultyId}
          onChange={(facultyId) => onChange({ facultyId })}
        />
      ) : null}

      {!isEdit && needsDepartment ? (
        <div className='space-y-1.5'>
          <Label>
            Department <span className='text-destructive'>*</span>
          </Label>
          <SearchSelect
            options={departmentOptions}
            value={form.departmentCode}
            onValueChange={(departmentCode) => onChange({ departmentCode })}
            placeholder='Select department'
            searchPlaceholder='Search department...'
            emptyText='No departments found.'
            loading={departmentsLoading}
          />
        </div>
      ) : null}

      {!isEdit && needsDepartment ? (
        <div className='space-y-1.5'>
          <Label>Primary faculty</Label>
          <div className='flex h-9 items-center rounded-md border border-border bg-muted px-3 text-sm text-foreground'>
            {primaryFacultyName ?? '—'}
          </div>
        </div>
      ) : null}
    </div>
  );
}
