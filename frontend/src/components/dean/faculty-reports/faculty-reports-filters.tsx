'use client';

import { useEffect, useMemo, useState } from 'react';
import { SearchSelect } from '@/features/ui/components/search-select';
import { cn } from '@/lib/utils';
import {
  GlobalFilterField,
  GlobalReportFilters,
  GLOBAL_FILTER_CONTROL
} from '@/components/reports/global-report-filters';
import { ReportCustomDateFields } from '@/components/reports/report-custom-date-fields';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import { useDeanBatches } from '@/lib/dean/queries';
import type { DeanBatch } from '@/lib/dean/types';

export interface FacultyReportFilterState {
  period: string;
  from: string | null;
  to: string | null;
  departmentId: string;
  batchId: string;
  sectionId: string;
  courseId: string;
  instructorId: string;
  studentLevel: string;
  status: string;
}

export const defaultFacultyReportFilters: FacultyReportFilterState = {
  period: 'semester',
  from: null,
  to: null,
  departmentId: 'all',
  batchId: 'all',
  sectionId: 'all',
  courseId: 'all',
  instructorId: 'all',
  studentLevel: 'all',
  status: 'all'
};

const STORAGE_KEY = 'faculty-reports-filters:v2';

interface FacultyReportsFiltersProps {
  filters: FacultyReportFilterState;
  onChange: (next: FacultyReportFilterState) => void;
  departments: { id: number; name: string; code: string }[];
  sticky?: boolean;
  className?: string;
}

function isFacultyFilters(raw: unknown): raw is FacultyReportFilterState {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return typeof o.period === 'string' && typeof o.departmentId === 'string';
}

function parseBatches(raw: unknown): DeanBatch[] {
  if (Array.isArray(raw)) return raw as DeanBatch[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { batches?: DeanBatch[] }).batches)) {
    return (raw as { batches: DeanBatch[] }).batches;
  }
  return [];
}

export function FacultyReportsFilters({
  filters,
  onChange,
  departments,
  sticky,
  className
}: FacultyReportsFiltersProps) {
  const [draft, setDraft] = useState(filters);
  const { data: semesterWindow } = useActiveSemesterWindow();
  const { data: batchesData } = useDeanBatches({ pageSize: '200' });

  const allBatches = useMemo(() => parseBatches(batchesData), [batchesData]);

  const batches = useMemo(() => {
    let list = allBatches;
    if (draft.departmentId !== 'all') {
      const deptId = Number(draft.departmentId);
      list = list.filter((b) => b.program?.department?.id === deptId);
    }
    if (draft.studentLevel !== 'all') {
      const level = draft.studentLevel.toUpperCase().replace(/\s+/g, '_');
      list = list.filter(
        (b) => String(b.program?.level ?? '').toUpperCase().replace(/\s+/g, '_') === level
      );
    }
    return list;
  }, [allBatches, draft.departmentId, draft.studentLevel]);

  const sections = useMemo(() => {
    if (draft.batchId === 'all') return [];
    const batch = batches.find((b) => String(b.id) === draft.batchId);
    return batch?.sections ?? [];
  }, [batches, draft.batchId]);

  const departmentOptions = useMemo(
    () => [
      { value: 'all', label: 'All departments' },
      ...departments.map((d) => ({ value: String(d.id), label: d.name }))
    ],
    [departments]
  );
  const batchOptions = useMemo(
    () => [
      { value: 'all', label: 'All batches' },
      ...batches.map((b) => ({ value: String(b.id), label: b.name }))
    ],
    [batches]
  );
  const sectionOptions = useMemo(
    () => [
      { value: 'all', label: 'All sections' },
      ...sections.map((s) => ({ value: String(s.id), label: s.name }))
    ],
    [sections]
  );

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const set = (patch: Partial<FacultyReportFilterState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.departmentId != null || patch.studentLevel != null) {
        next.batchId = 'all';
        next.sectionId = 'all';
      }
      if (patch.batchId != null) {
        next.sectionId = 'all';
      }
      return next;
    });
  };

  const handlePeriodChange = (v: string) => {
    if (v === 'custom') {
      set({
        period: 'custom',
        from: draft.from ?? semesterWindow?.minDate ?? null,
        to: draft.to ?? semesterWindow?.maxDate ?? null
      });
      return;
    }
    set({ period: v, from: null, to: null });
  };

  return (
    <GlobalReportFilters
      sticky={sticky}
      className={className}
      description='Uses the active university semester by default. Custom dates stay within that semester through today.'
      storageKey={STORAGE_KEY}
      onLoadTemplate={(raw) => {
        if (isFacultyFilters(raw)) {
          setDraft({
            ...defaultFacultyReportFilters,
            ...raw,
            batchId: typeof raw.batchId === 'string' ? raw.batchId : 'all',
            sectionId: typeof raw.sectionId === 'string' ? raw.sectionId : 'all',
            from: typeof raw.from === 'string' ? raw.from : null,
            to: typeof raw.to === 'string' ? raw.to : null
          });
        }
      }}
      onApply={() => onChange(draft)}
      onReset={() => {
        setDraft(defaultFacultyReportFilters);
        onChange(defaultFacultyReportFilters);
      }}
    >
      <GlobalFilterField label='Time range'>
        <SearchSelect
          options={[
            { value: 'semester', label: 'Current semester' },
            { value: 'custom', label: 'Custom dates' }
          ]}
          value={draft.period}
          onValueChange={handlePeriodChange}
          placeholder='Period'
          searchPlaceholder='Search...'
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>

      {draft.period === 'custom' ? (
        <ReportCustomDateFields
          from={draft.from}
          to={draft.to}
          minDate={semesterWindow?.minDate ?? null}
          maxDate={semesterWindow?.maxDate ?? null}
          hint={
            semesterWindow?.label
              ? `Limited to ${semesterWindow.label} (from semester start through today).`
              : 'Limited to the active semester start through today.'
          }
          onChange={(patch) => set(patch)}
        />
      ) : null}

      <GlobalFilterField label='Department'>
        <SearchSelect
          options={departmentOptions}
          value={draft.departmentId}
          onValueChange={(v) => set({ departmentId: v })}
          placeholder='Department'
          searchPlaceholder='Search departments...'
          emptyText='No departments found.'
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>

      <GlobalFilterField label='Level'>
        <SearchSelect
          options={[
            { value: 'all', label: 'All levels' },
            { value: 'UNDERGRADUATE', label: 'Undergraduate' },
            { value: 'POSTGRADUATE', label: 'Postgraduate' }
          ]}
          value={draft.studentLevel}
          onValueChange={(v) => set({ studentLevel: v })}
          placeholder='Student level'
          searchPlaceholder='Search...'
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>

      <GlobalFilterField label='Batch'>
        <SearchSelect
          options={batchOptions}
          value={draft.batchId}
          onValueChange={(v) => set({ batchId: v })}
          placeholder='Batch'
          searchPlaceholder='Search batches...'
          emptyText='No batches found.'
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>

      <GlobalFilterField label='Section'>
        <SearchSelect
          options={sectionOptions}
          value={draft.sectionId}
          onValueChange={(v) => set({ sectionId: v })}
          disabled={draft.batchId === 'all'}
          placeholder={draft.batchId === 'all' ? 'Pick batch first' : 'Section'}
          searchPlaceholder='Search sections...'
          emptyText='No sections found.'
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>

      <GlobalFilterField label='Status'>
        <SearchSelect
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'Good Standing', label: 'Good Standing' },
            { value: 'At Risk', label: 'At Risk' },
            { value: 'Probation', label: 'Probation' }
          ]}
          value={draft.status}
          onValueChange={(v) => set({ status: v })}
          placeholder='Status'
          searchPlaceholder='Search...'
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>
    </GlobalReportFilters>
  );
}
