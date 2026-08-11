'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { BatchSearchSelect } from './batch-search-select';

export type BatchFormState = {
  programId: string;
  batchNumber: string;
  academicYearId: string;
  semesterNumber: string;
};

type ProgramOpt = { id: number; name: string; code: string; durationYears?: number };
type YearOpt = { id: number; name: string };
type SemOpt = { value: string; label: string };

type Props = {
  form: BatchFormState;
  setForm: Dispatch<SetStateAction<BatchFormState>>;
  emptyForm: () => BatchFormState;
  programs: ProgramOpt[];
  academicYears: YearOpt[];
  semesterOptions: SemOpt[];
  facultyCode: string;
  durationYears: number;
  batchNamePreview: string;
  cohortPreview: {
    cohortSemester: number;
    maxSemesters: number;
    isGraduated: boolean;
  } | null;
};

export function BatchFormFields({
  form,
  setForm,
  emptyForm,
  programs,
  academicYears,
  semesterOptions,
  facultyCode,
  durationYears,
  batchNamePreview,
  cohortPreview
}: Props) {
  return (
    <div className='space-y-3'>
      <BatchSearchSelect
        label='Program'
        required
        placeholder='Search and select program...'
        value={form.programId}
        onChange={(programId) =>
          setForm((current) => ({
            ...emptyForm(),
            programId,
            batchNumber: current.batchNumber
          }))
        }
        options={programs.map((program) => ({
          value: String(program.id),
          label: program.name,
          hint: `${program.code} · ${program.durationYears ?? 4}y`
        }))}
        emptyMessage='No programs found.'
      />

      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='faculty-code'>Faculty code</Label>
          <Input
            id='faculty-code'
            value={facultyCode}
            readOnly
            placeholder='Select program'
            className='bg-muted'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='duration'>Program duration</Label>
          <Input
            id='duration'
            value={form.programId ? `${durationYears} years (${durationYears * 2} sem)` : ''}
            readOnly
            placeholder='From program'
            className='bg-muted'
          />
        </div>
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='batch-number'>
          Batch number <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='batch-number'
          type='number'
          min={1}
          disabled={!form.programId}
          value={form.batchNumber}
          onChange={(e) => setForm((current) => ({ ...current, batchNumber: e.target.value }))}
          placeholder='e.g. 1, 5'
        />
      </div>

      <div className='space-y-1.5'>
        <Label htmlFor='batch-name-preview'>Batch name (auto)</Label>
        <Input
          id='batch-name-preview'
          value={batchNamePreview}
          readOnly
          placeholder='PROGRAM-FC-B1'
          className='bg-muted font-medium'
        />
      </div>

      <BatchSearchSelect
        label='Intake academic year'
        required
        placeholder='Search academic year...'
        value={form.academicYearId}
        onChange={(academicYearId) =>
          setForm((current) => ({ ...current, academicYearId, semesterNumber: '' }))
        }
        options={academicYears.map((year) => ({
          value: String(year.id),
          label: year.name
        }))}
        emptyMessage='No academic years found.'
      />

      <BatchSearchSelect
        label='Current semester (auto)'
        required
        placeholder={form.academicYearId ? 'Search semester...' : 'Select academic year first'}
        value={form.semesterNumber}
        onChange={(semesterNumber) => setForm((current) => ({ ...current, semesterNumber }))}
        options={semesterOptions}
        disabled={!form.academicYearId}
        emptyMessage={
          form.academicYearId
            ? 'No semester options for this program duration.'
            : 'Select an academic year first.'
        }
      />

      {cohortPreview ? (
        <p className='text-muted-foreground text-xs'>
          Auto: semester {cohortPreview.cohortSemester} / {cohortPreview.maxSemesters}
          {cohortPreview.isGraduated ? ' · past duration' : ''}
        </p>
      ) : null}
    </div>
  );
}
