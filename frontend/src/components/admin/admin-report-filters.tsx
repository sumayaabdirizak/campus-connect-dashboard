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
import type {
  AdminFaculty,
  AdminReportPeriod,
  PlatformAnalytics
} from '@/lib/admin/services';

export interface AdminReportFilterState {
  facultyId: number | null;
  period: AdminReportPeriod;
  from: string | null;
  to: string | null;
}

export const defaultAdminReportFilters: AdminReportFilterState = {
  facultyId: null,
  period: 'semester',
  from: null,
  to: null
};

const STORAGE_KEY = 'admin-reports-filters:v1';

const PERIOD_OPTIONS: { value: AdminReportPeriod; label: string }[] = [
  { value: 'semester', label: 'Current semester' },
  { value: 'custom', label: 'Custom dates' }
];

interface AdminReportFiltersProps {
  faculties: AdminFaculty[];
  value: AdminReportFilterState;
  onChange: (next: AdminReportFilterState) => void;
  loadingFaculties?: boolean;
  disabled?: boolean;
  sticky?: boolean;
  className?: string;
}

function isAdminFilters(raw: unknown): raw is AdminReportFilterState {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return (
    (o.facultyId === null || typeof o.facultyId === 'number') &&
    typeof o.period === 'string'
  );
}

export function AdminReportFilters({
  faculties,
  value,
  onChange,
  loadingFaculties,
  disabled,
  sticky,
  className
}: AdminReportFiltersProps) {
  const [draft, setDraft] = useState(value);
  const { data: semesterWindow } = useActiveSemesterWindow(draft.facultyId);

  const facultyOptions = useMemo(
    () => [
      { value: 'all', label: 'All faculties' },
      ...faculties.map((f) => ({ value: String(f.id), label: f.name }))
    ],
    [faculties]
  );

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handlePeriodChange = (v: string) => {
    const period = v as AdminReportPeriod;
    if (period === 'custom') {
      setDraft((prev) => ({
        ...prev,
        period,
        from: prev.from ?? semesterWindow?.minDate ?? null,
        to: prev.to ?? semesterWindow?.maxDate ?? null
      }));
      return;
    }
    setDraft((prev) => ({ ...prev, period, from: null, to: null }));
  };

  return (
    <GlobalReportFilters
      sticky={sticky}
      className={className}
      description='Default is the active university semester. Custom dates stay within that semester through today.'
      storageKey={STORAGE_KEY}
      onLoadTemplate={(raw) => {
        if (isAdminFilters(raw)) {
          setDraft({
            ...defaultAdminReportFilters,
            ...raw,
            from: typeof (raw as AdminReportFilterState).from === 'string'
              ? (raw as AdminReportFilterState).from
              : null,
            to: typeof (raw as AdminReportFilterState).to === 'string'
              ? (raw as AdminReportFilterState).to
              : null
          });
        }
      }}
      applyDisabled={disabled}
      onApply={() => onChange(draft)}
      onReset={() => {
        setDraft(defaultAdminReportFilters);
        onChange(defaultAdminReportFilters);
      }}
    >
      <GlobalFilterField label='Time range'>
        <SearchSelect
          options={PERIOD_OPTIONS}
          value={draft.period}
          onValueChange={handlePeriodChange}
          disabled={disabled}
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
          disabled={disabled}
          hint={
            semesterWindow?.label
              ? `Limited to ${semesterWindow.label} (from semester start through today).`
              : 'Limited to the active semester start through today.'
          }
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        />
      ) : null}

      <GlobalFilterField label='Faculty'>
        <SearchSelect
          options={facultyOptions}
          value={draft.facultyId != null ? String(draft.facultyId) : 'all'}
          onValueChange={(v) =>
            setDraft((prev) => ({
              ...prev,
              facultyId: v === 'all' ? null : Number(v)
            }))
          }
          disabled={disabled || loadingFaculties}
          placeholder='Faculty'
          searchPlaceholder='Search faculties...'
          emptyText='No faculties found.'
          loading={loadingFaculties}
          className={cn('w-full', GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>
    </GlobalReportFilters>
  );
}

export function formatReportScopeSummary(scope?: PlatformAnalytics['scope']): string {
  if (!scope) return 'University-wide stats';
  const parts: string[] = [];
  if (scope.facultyName) parts.push(scope.facultyName);
  else parts.push('All faculties');
  parts.push(scope.periodLabel.toLowerCase());
  return parts.join(' · ');
}
