'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { useDepartments } from '@/lib/departments/queries';
import { createProgram, updateProgram, type Program, type ProgramInput } from '@/lib/programs/services';
import { handleApiError, showToast } from '@/lib/notifications';
import { buildDefaultProgramCode, LEVEL_CODE_PREFIX } from '@/lib/programs/services';
import { ProgramFormFields } from './program-form-fields';

type Props = { program?: Program; open: boolean; onOpenChange: (open: boolean) => void };

const emptyForm: ProgramInput = {
  name: '',
  code: `${LEVEL_CODE_PREFIX.UNDERGRADUATE}-`,
  level: 'UNDERGRADUATE',
  departmentId: 0,
  durationYears: 4
};

export function ProgramFormSheet({ program, open, onOpenChange }: Props) {
  const [form, setForm] = useState<ProgramInput>(emptyForm);
  const [codeTouched, setCodeTouched] = useState(false);
  const { data } = useDepartments();
  const queryClient = useQueryClient();
  const departments = data?.departments ?? [];
  const isEdit = Boolean(program);

  const departmentOptions = useMemo(
    () =>
      departments.map((department) => ({
        value: String(department.id),
        label: department.name,
        sub: department.code || department.faculty?.name
      })),
    [departments]
  );

  const selectedDept = useMemo(
    () => departments.find((d) => d.id === form.departmentId),
    [departments, form.departmentId]
  );

  useEffect(() => {
    if (!open) return;
    setCodeTouched(false);
    setForm(
      program
        ? {
            name: program.name,
            code: program.code,
            level: program.level,
            departmentId: program.departmentId,
            durationYears: program.durationYears ?? 4
          }
        : emptyForm
    );
  }, [open, program]);

  const mutation = useMutation({
    mutationFn: (values: ProgramInput) =>
      program ? updateProgram({ id: program.id, values }) : createProgram(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['programs'] });
      showToast(
        'success',
        program ? 'Program updated successfully' : 'Program created successfully'
      );
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to save program')
  });

  const nextCode = (level: ProgramInput['level'], deptCode?: string) => {
    if (isEdit || codeTouched) return null;
    return buildDefaultProgramCode(level, deptCode);
  };

  const onLevelChange = (levelValue: string) => {
    const level = levelValue as ProgramInput['level'];
    const code = nextCode(level, selectedDept?.code);
    setForm((current) => ({
      ...current,
      level,
      ...(code != null ? { code } : {})
    }));
  };

  const onDepartmentChange = (id: string) => {
    if (!id) {
      const code = nextCode(form.level, undefined);
      setForm((current) => ({
        ...current,
        departmentId: 0,
        ...(code != null ? { code } : {})
      }));
      return;
    }
    const department = departments.find((item) => item.id === Number(id));
    const inherited = department?.faculty?.defaultDurationYears;
    const code = nextCode(form.level, department?.code);
    setForm((current) => ({
      ...current,
      departmentId: Number(id),
      ...(inherited && !program ? { durationYears: inherited } : {}),
      ...(code != null ? { code } : {})
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = form.code.trim().replace(/-$/, '');
    if (!form.name.trim() || !code || !form.departmentId) {
      showToast('error', 'Name, code and department are required');
      return;
    }
    mutation.mutate({ ...form, code: code.toUpperCase() });
  };

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Program' : 'Create New Program'}
      formId='program-form'
      submitLabel={isEdit ? 'Update' : 'Create New'}
      submitIcon={isEdit ? 'check' : 'add'}
      submitting={mutation.isPending}
    >
      <form id='program-form' onSubmit={submit}>
        <ProgramFormFields
          form={form}
          setForm={setForm}
          isEdit={isEdit}
          departmentOptions={departmentOptions}
          selectedDeptCode={selectedDept?.code}
          onLevelChange={onLevelChange}
          onDepartmentChange={onDepartmentChange}
          onCodeChange={(code) => {
            setCodeTouched(true);
            setForm((f) => ({ ...f, code }));
          }}
        />
      </form>
    </PosFormModal>
  );
}
