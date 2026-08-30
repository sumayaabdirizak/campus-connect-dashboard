'use client';

import { useMemo } from 'react';
import { Label } from '@/features/ui/components/label';
import { SearchSelect } from '@/features/ui/components/search-select';
import type { Department } from '@/lib/departments/service';
import type { FacultyOption } from '@/lib/faculties/faculty-list';
import type { Program } from '@/lib/programs/service';
import type { UserFormState } from '@/lib/users/services/user-form-state';

type AcademicYearOption = {
  id: number;
  name: string;
  inActiveWindow?: boolean;
  activeSemester?: { id: number; name: string } | null;
  semesters?: Array<{ id: number; name: string; sequence?: number }>;
};

type SectionOption = {
  id: number;
  name: string;
  batchId: number;
};

type BatchOption = {
  id: number;
  name: string;
  programId?: number;
  academicYearId?: number;
  academicYear?: { id: number; name: string };
  currentAcademicYearName?: string;
  status?: string;
};

type Props = {
  form: UserFormState;
  onChange: (patch: Partial<UserFormState>) => void;
  faculties: FacultyOption[];
  departments: Department[];
  programs: Program[];
  batches: BatchOption[];
  sections: SectionOption[];
  academicYears: AcademicYearOption[];
};

export function UserFormStudentSection({
  form,
  onChange,
  faculties,
  departments,
  programs,
  batches,
  sections,
  academicYears
}: Props) {
  const facultyOptions = useMemo(
    () =>
      faculties.map((f) => ({
        value: String(f.id),
        label: f.name,
        sub: f.code
      })),
    [faculties]
  );

  const departmentOptions = useMemo(() => {
    const fid = Number(form.facultyId);
    return departments
      .filter((d) => !fid || d.facultyId === fid)
      .map((d) => ({
        value: String(d.id),
        label: d.name,
        sub: d.code
      }));
  }, [departments, form.facultyId]);

  const programOptions = useMemo(() => {
    const did = Number(form.departmentId);
    return programs
      .filter((p) => !did || p.departmentId === did)
      .map((p) => ({
        value: String(p.id),
        label: p.name,
        sub: p.code
      }));
  }, [programs, form.departmentId]);

  const batchOptions = useMemo(() => {
    const programId = Number(form.programId);
    if (!programId) return [];
    return batches
      .filter(
        (b) =>
          b.programId === programId && (b.status ?? 'ACTIVE') !== 'GRADUATED'
      )
      .map((b) => ({
        value: String(b.id),
        label: b.name,
        sub: b.academicYear?.name ?? b.currentAcademicYearName
      }));
  }, [batches, form.programId]);

  const sectionOptions = useMemo(() => {
    const batchId = Number(form.batchId);
    if (!batchId) return [];
    return sections
      .filter((s) => s.batchId === batchId)
      .map((s) => ({
        value: String(s.id),
        label: s.name
      }));
  }, [sections, form.batchId]);

  function onFacultyChange(facultyId: string) {
    onChange({
      facultyId,
      departmentId: '',
      departmentCode: '',
      programId: '',
      batchId: '',
      batchSectionId: '',
      academicYearId: '',
      semesterId: ''
    });
  }

  function onDepartmentChange(departmentId: string) {
    const dept = departments.find((d) => String(d.id) === departmentId);
    onChange({
      departmentId,
      departmentCode: dept?.code ?? '',
      programId: '',
      batchId: '',
      batchSectionId: '',
      academicYearId: '',
      semesterId: ''
    });
  }

  function onProgramChange(programId: string) {
    onChange({
      programId,
      batchId: '',
      batchSectionId: '',
      academicYearId: '',
      semesterId: ''
    });
  }

  function onBatchChange(batchId: string) {
    const batch = batches.find((b) => String(b.id) === batchId);
    const year = academicYears.find((y) => y.id === batch?.academicYearId);
    const semester = year?.activeSemester ?? year?.semesters?.[0] ?? null;

    onChange({
      batchId,
      batchSectionId: '',
      academicYearId: batch?.academicYearId ? String(batch.academicYearId) : '',
      semesterId: semester ? String(semester.id) : ''
    });
  }

  return (
    <div className='mt-2 space-y-3 rounded-lg border border-border bg-muted p-3'>
      <h4 className='text-sm font-semibold text-foreground'>Student enrollment</h4>
      <p className='text-xs text-muted-foreground'>
        Faculty → department → program → batch → section
      </p>

      <div className='space-y-1.5'>
        <Label>
          Faculty <span className='text-destructive'>*</span>
        </Label>
        <SearchSelect
          options={facultyOptions}
          value={form.facultyId}
          onValueChange={onFacultyChange}
          placeholder='Select faculty'
          searchPlaceholder='Search faculty...'
          emptyText='No faculties found.'
        />
      </div>

      <div className='space-y-1.5'>
        <Label>
          Department <span className='text-destructive'>*</span>
        </Label>
        <SearchSelect
          options={departmentOptions}
          value={form.departmentId}
          onValueChange={onDepartmentChange}
          placeholder={form.facultyId ? 'Select department' : 'Pick faculty first'}
          searchPlaceholder='Search department...'
          emptyText='No departments found.'
          disabled={!form.facultyId}
        />
      </div>

      <div className='space-y-1.5'>
        <Label>
          Program <span className='text-destructive'>*</span>
        </Label>
        <SearchSelect
          options={programOptions}
          value={form.programId}
          onValueChange={onProgramChange}
          placeholder={form.departmentId ? 'Select program' : 'Pick department first'}
          searchPlaceholder='Search program...'
          emptyText='No programs found.'
          disabled={!form.departmentId}
        />
      </div>

      <div className='space-y-1.5'>
        <Label>
          Batch <span className='text-destructive'>*</span>
        </Label>
        <SearchSelect
          options={batchOptions}
          value={form.batchId}
          onValueChange={onBatchChange}
          placeholder={form.programId ? 'Select batch' : 'Pick program first'}
          searchPlaceholder='Search batch...'
          emptyText='No batches for this program.'
          disabled={!form.programId}
        />
      </div>

      <div className='space-y-1.5'>
        <Label>
          Section <span className='text-destructive'>*</span>
        </Label>
        <SearchSelect
          options={sectionOptions}
          value={form.batchSectionId}
          onValueChange={(batchSectionId) => onChange({ batchSectionId })}
          placeholder={form.batchId ? 'Select section' : 'Pick batch first'}
          searchPlaceholder='Search section...'
          emptyText='No sections in this batch.'
          disabled={!form.batchId}
        />
      </div>
    </div>
  );
}
