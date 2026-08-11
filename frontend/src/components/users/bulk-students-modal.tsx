'use client';

import { useEffect, useMemo, useState } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { useAdminBatches } from '@/components/batches-admin/api/queries';
import { useDepartments } from '@/lib/departments/queries';
import { normalizeFacultiesList } from '@/lib/faculties/faculty-list';
import { usePrograms } from '@/lib/programs/queries';
import { apiClient } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { registerStudentsBulk } from '@/lib/users/services';
import { useAcademicYears, useBatchSections } from '@/lib/users/queries';
import { EMPTY_USER_FORM, type UserFormState } from '@/lib/users/services/user-form-state';
import { parseStudentCsv, type StudentCsvRow } from '@/lib/users/services/parse-student-csv';
import { BulkStudentsCsvField } from './bulk-students-csv-field';
import { UserFormStudentSection } from './user-form-student-section';

const FORM_ID = 'bulk-students-form';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BulkStudentsModal({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [enrollment, setEnrollment] = useState<UserFormState>({
    ...EMPTY_USER_FORM,
    role: 'STUDENT'
  });
  const [password, setPassword] = useState('Student123!');
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<StudentCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: sectionsData } = useBatchSections();
  const { data: academicYearsData } = useAcademicYears();
  const { data: departmentsData } = useDepartments();
  const { data: programsData } = usePrograms();
  const { data: batchesData } = useAdminBatches();
  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties', 'all-for-bulk-students'],
    queryFn: async () => {
      const data = await apiClient<{
        faculties?: Array<{ id: number; name: string; code: string }>;
        results?: Array<{ id: number; name: string; code: string }>;
      }>('/faculties?limit=200');
      return normalizeFacultiesList(data);
    },
    enabled: open
  });

  useEffect(() => {
    if (!open) return;
    setEnrollment({ ...EMPTY_USER_FORM, role: 'STUDENT' });
    setPassword('Student123!');
    setCsvText('');
    setParsed([]);
    setParseErrors([]);
  }, [open]);

  useEffect(() => {
    const { rows, parseErrors: errs } = parseStudentCsv(csvText);
    setParsed(rows);
    setParseErrors(errs);
  }, [csvText]);

  const canSubmit =
    Boolean(enrollment.batchSectionId) &&
    Boolean(enrollment.academicYearId) &&
    Boolean(enrollment.semesterId) &&
    password.length >= 8 &&
    parsed.length > 0;

  const hint = useMemo(() => {
    if (!parsed.length) return 'Paste or upload CSV: full_name,email';
    return `${parsed.length} student${parsed.length === 1 ? '' : 's'} ready`;
  }, [parsed.length]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await registerStudentsBulk({
        password,
        batchSectionId: Number(enrollment.batchSectionId),
        academicYearId: Number(enrollment.academicYearId),
        semesterId: Number(enrollment.semesterId),
        students: parsed
      });
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      const fail = result.errors?.length ?? 0;
      showToast(
        fail ? 'warning' : 'success',
        fail
          ? `Created ${result.created.length}; ${fail} failed`
          : `Created ${result.created.length} students`
      );
      if (result.created.length) onOpenChange(false);
    } catch (err) {
      handleApiError(err, 'Bulk import failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title='Bulk Students'
      formId={FORM_ID}
      submitLabel={submitting ? 'Importing…' : `Import ${parsed.length || ''}`}
      submitting={submitting}
      submitDisabled={!canSubmit || submitting}
      className='sm:max-w-lg'
    >
      <form id={FORM_ID} onSubmit={onSubmit} className='space-y-4'>
        <UserFormStudentSection
          form={enrollment}
          onChange={(patch) => setEnrollment((f) => ({ ...f, ...patch }))}
          faculties={faculties}
          departments={departmentsData?.departments ?? []}
          programs={programsData?.programs ?? []}
          batches={(batchesData?.batches ?? []) as never}
          sections={sectionsData?.sections ?? []}
          academicYears={(academicYearsData?.academicYears ?? []) as never}
        />

        <div className='space-y-1.5'>
          <Label htmlFor='bulk-password'>
            Default password <span className='text-destructive'>*</span>
          </Label>
          <Input
            id='bulk-password'
            type='text'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <p className='text-xs text-[#6A7282]'>
            Same temporary password for all imported students.
          </p>
        </div>

        <BulkStudentsCsvField
          csvText={csvText}
          onCsvText={setCsvText}
          hint={hint}
          parseErrors={parseErrors}
        />
      </form>
    </PosFormModal>
  );
}
