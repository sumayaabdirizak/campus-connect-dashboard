'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import {
  adminBatchesQueryKey,
  useAdminAcademicYears,
  useAdminPrograms
} from '@/lib/batches-admin/queries';
import { createAdminBatch } from '@/lib/batches-admin/services';
import { buildBatchName, parseAcademicYearStart } from '@/lib/batches-admin/services/build-batch-name';
import {
  cohortSemesterOptions,
  computeCohortSemester
} from '@/lib/batches-admin/services/cohort-semester';
import { BatchFormFields, type BatchFormState } from './batch-form-fields';

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

const emptyForm = (): BatchFormState => ({
  programId: '',
  batchNumber: '',
  academicYearId: '',
  semesterNumber: ''
});

/** @deprecated Prefer BatchFormModal — kept as alias for existing imports. */
export function BatchFormSheet(props: Props) {
  return <BatchFormModal {...props} />;
}

export function BatchFormModal({ open, onOpenChange }: Props) {
  const [form, setForm] = useState<BatchFormState>(emptyForm());
  const { data: programs = [] } = useAdminPrograms();
  const { data: academicYears = [] } = useAdminAcademicYears();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const selectedProgram = useMemo(
    () => programs.find((program) => String(program.id) === form.programId),
    [programs, form.programId]
  );

  const facultyCode = selectedProgram?.department?.faculty?.code ?? '';
  const durationYears = selectedProgram?.durationYears ?? 4;

  const selectedYear = useMemo(
    () => academicYears.find((year) => String(year.id) === form.academicYearId),
    [academicYears, form.academicYearId]
  );

  const semesterOptions = useMemo(
    () => cohortSemesterOptions(durationYears),
    [durationYears]
  );

  const batchNamePreview = buildBatchName(
    selectedProgram?.code ?? '',
    facultyCode,
    form.batchNumber
  );

  const cohortPreview = useMemo(() => {
    if (!selectedYear) return null;
    return computeCohortSemester(parseAcademicYearStart(selectedYear.name), durationYears);
  }, [selectedYear, durationYears]);

  useEffect(() => {
    if (!cohortPreview) return;
    const next = String(cohortPreview.cohortSemester);
    setForm((current) =>
      current.semesterNumber === next ? current : { ...current, semesterNumber: next }
    );
  }, [cohortPreview]);

  const mutation = useMutation({
    mutationFn: createAdminBatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBatchesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['dean', 'batches'] });
      showToast('success', 'Batch created successfully');
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to create batch')
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProgram || !facultyCode || !form.batchNumber.trim()) {
      showToast('error', 'Select a program and enter a batch number');
      return;
    }
    const semesterNumber = Number(form.semesterNumber);
    if (!selectedYear || !Number.isFinite(semesterNumber) || semesterNumber < 1) {
      showToast('error', 'Select academic year and semester');
      return;
    }

    mutation.mutate({
      name: batchNamePreview,
      programId: selectedProgram.id,
      academicYearId: selectedYear.id,
      semester_number: semesterNumber,
      academic_year: parseAcademicYearStart(selectedYear.name)
    });
  };

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title='Create New Batch'
      formId='batch-form'
      submitLabel='Create New'
      submitting={mutation.isPending}
      submitDisabled={!batchNamePreview}
    >
      <form id='batch-form' onSubmit={submit}>
        <BatchFormFields
          form={form}
          setForm={setForm}
          emptyForm={emptyForm}
          programs={programs}
          academicYears={academicYears}
          semesterOptions={semesterOptions}
          facultyCode={facultyCode}
          durationYears={durationYears}
          batchNamePreview={batchNamePreview}
          cohortPreview={cohortPreview}
        />
      </form>
    </PosFormModal>
  );
}
