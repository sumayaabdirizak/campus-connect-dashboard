'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  clampIsoDate,
  REPORT_PERIOD_OPTIONS,
  validateReportDateRange,
  type ReportDateRange
} from '@/lib/reports/period-utils';
import type { ReportScope } from '@/lib/reports/types';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import {
  GlobalFilterField,
  GlobalReportFilters,
  GLOBAL_FILTER_CONTROL
} from './global-report-filters';
import { ReportCustomDateFields } from './report-custom-date-fields';

const fieldError = 'text-xs text-destructive';

export type ReportFilterValues = {
  scope: ReportScope;
  periodPreset: string;
  dateRange: ReportDateRange;
  status: string;
};

const STORAGE_KEY = 'entity-reports-filters:v1';

export function ReportFiltersPanel({
  values,
  onChange,
  onGenerate,
  onReset,
  isGenerating = false
}: {
  values: ReportFilterValues;
  onChange: (patch: Partial<ReportFilterValues>) => void;
  onGenerate: () => void;
  onReset: () => void;
  isGenerating?: boolean;
}) {
  const { scope, periodPreset, dateRange, status } = values;
  const { data: semesterWindow } = useActiveSemesterWindow();
  const isCustom = periodPreset === 'custom';
  const minDate = semesterWindow?.minDate ?? null;
  const maxDate = semesterWindow?.maxDate ?? null;

  const dateErrors = isCustom
    ? validateReportDateRange(dateRange, {
        requireAny: true,
        minDate,
        maxDate
      })
    : null;

  const periodOptions = [
    ...REPORT_PERIOD_OPTIONS,
    { id: 'custom', label: 'Custom dates' }
  ];

  const handlePeriodChange = (id: string) => {
    if (id === 'custom') {
      const hasAny = Boolean(dateRange.from || dateRange.to);
      onChange({
        periodPreset: 'custom',
        dateRange: hasAny
          ? dateRange
          : {
              from: minDate,
              to: maxDate
            }
      });
      return;
    }
    onChange({
      periodPreset: id,
      dateRange: { from: null, to: null }
    });
  };

  return (
    <GlobalReportFilters
      description='Default is the active university semester. Custom dates stay within that semester through today.'
      storageKey={STORAGE_KEY}
      getTemplate={() => values}
      onLoadTemplate={(raw) => {
        if (!raw || typeof raw !== 'object') return;
        const o = raw as Partial<ReportFilterValues>;
        onChange({
          periodPreset: typeof o.periodPreset === 'string' ? o.periodPreset : values.periodPreset,
          dateRange:
            o.dateRange && typeof o.dateRange === 'object'
              ? {
                  from: (o.dateRange as ReportDateRange).from ?? null,
                  to: (o.dateRange as ReportDateRange).to ?? null
                }
              : values.dateRange,
          status: typeof o.status === 'string' ? o.status : values.status
        });
      }}
      applyLabel={isGenerating ? 'Generating…' : 'Apply filters'}
      applyDisabled={isGenerating}
      onApply={onGenerate}
      onReset={onReset}
    >
      <GlobalFilterField label='Time range'>
        <Select value={periodPreset} onValueChange={handlePeriodChange}>
          <SelectTrigger className={cn('w-full', GLOBAL_FILTER_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </GlobalFilterField>

      {isCustom ? (
        <ReportCustomDateFields
          from={dateRange.from}
          to={dateRange.to}
          minDate={minDate}
          maxDate={maxDate}
          hint={
            semesterWindow?.label
              ? `Limited to ${semesterWindow.label} (from semester start through today).`
              : 'Limited to the active semester start through today.'
          }
          onChange={(patch) => {
            onChange({
              periodPreset: 'custom',
              dateRange: {
                from:
                  patch.from !== undefined
                    ? clampIsoDate(
                        patch.from,
                        minDate,
                        dateRange.to && maxDate && dateRange.to < maxDate
                          ? dateRange.to
                          : maxDate
                      )
                    : dateRange.from,
                to:
                  patch.to !== undefined
                    ? clampIsoDate(patch.to, dateRange.from ?? minDate, maxDate)
                    : dateRange.to
              }
            });
          }}
        />
      ) : null}

      {scope === 'batch' ? (
        <GlobalFilterField label='Status'>
          <Select value={status} onValueChange={(v) => onChange({ status: v })}>
            <SelectTrigger
              className={cn('w-full', GLOBAL_FILTER_CONTROL)}
              aria-label='Batch status'
            >
              <SelectValue placeholder='All statuses' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All statuses</SelectItem>
              <SelectItem value='ACTIVE'>Active</SelectItem>
              <SelectItem value='INACTIVE'>Inactive</SelectItem>
            </SelectContent>
          </Select>
        </GlobalFilterField>
      ) : null}

      {isCustom && dateErrors?.general ? (
        <p className={cn(fieldError, 'sm:col-span-2 xl:col-span-4')}>
          {dateErrors.general}
        </p>
      ) : null}
      {isCustom && dateErrors?.from ? (
        <p className={cn(fieldError, 'sm:col-span-2 xl:col-span-4')}>{dateErrors.from}</p>
      ) : null}
      {isCustom && dateErrors?.to ? (
        <p className={cn(fieldError, 'sm:col-span-2 xl:col-span-4')}>{dateErrors.to}</p>
      ) : null}
    </GlobalReportFilters>
  );
}
