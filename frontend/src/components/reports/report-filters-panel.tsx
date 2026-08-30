'use client';

import { Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  todayIsoDate,
  validateReportDateRange,
  type ReportDateRange
} from '@/lib/reports/period-utils';
import type { ReportScope } from '@/lib/reports/types';
import { CARD, LABEL_SM } from './report-theme';

const fieldLabel =
  'text-[11px] font-semibold uppercase tracking-wide text-[#667085] dark:text-muted-foreground';

const fieldError = 'text-xs text-destructive';

export type ReportFilterValues = {
  scope: ReportScope;
  periodPreset: string;
  dateRange: ReportDateRange;
  status: string;
};

export function ReportFiltersPanel({
  values,
  onChange,
  onGenerate,
  isGenerating = false
}: {
  values: ReportFilterValues;
  onChange: (patch: Partial<ReportFilterValues>) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}) {
  const { scope, periodPreset, dateRange, status } = values;
  const today = todayIsoDate();
  const isCustom = periodPreset === 'custom';
  const dateErrors = isCustom
    ? validateReportDateRange(dateRange, { requireAny: true })
    : null;
  const generateDisabled = isCustom && dateErrors != null;

  const periodOptions = [
    ...REPORT_PERIOD_OPTIONS,
    { id: 'custom', label: 'Custom dates' }
  ];

  const fromMax = dateRange.to && dateRange.to <= today ? dateRange.to : today;
  const toMin = dateRange.from ?? undefined;

  const setFrom = (raw: string) => {
    const from = clampIsoDate(raw || null, null, fromMax);
    onChange({
      periodPreset: 'custom',
      dateRange: { ...dateRange, from }
    });
  };

  const setTo = (raw: string) => {
    const to = clampIsoDate(raw || null, toMin, today);
    onChange({
      periodPreset: 'custom',
      dateRange: { ...dateRange, to }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateDisabled) onGenerate();
  };

  return (
    <div className={cn(CARD, 'p-4')}>
      <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
          <div className='min-w-0 flex-1 space-y-1.5'>
            <span className={fieldLabel}>Period</span>
            <Select
              value={periodPreset}
              onValueChange={(id) => onChange({ periodPreset: id })}
            >
              <SelectTrigger className='h-10 w-full border-[#D0D5DD] bg-white dark:border-border dark:bg-background'>
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
          </div>

          <div className='grid min-w-0 flex-1 grid-cols-2 gap-3 sm:max-w-md'>
            <div className='space-y-1.5'>
              <span className={fieldLabel}>From</span>
              <Input
                type='date'
                value={dateRange.from ?? ''}
                min={undefined}
                max={fromMax}
                onChange={(e) => setFrom(e.target.value)}
                className={cn(
                  'h-10 border-[#D0D5DD] bg-white dark:border-border dark:bg-background',
                  isCustom && dateErrors?.from && 'border-destructive'
                )}
                aria-invalid={isCustom && dateErrors?.from ? true : undefined}
              />
              {isCustom && dateErrors?.from ? (
                <p className={fieldError}>{dateErrors.from}</p>
              ) : null}
            </div>
            <div className='space-y-1.5'>
              <span className={fieldLabel}>To</span>
              <Input
                type='date'
                value={dateRange.to ?? ''}
                min={toMin}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className={cn(
                  'h-10 border-[#D0D5DD] bg-white dark:border-border dark:bg-background',
                  isCustom && dateErrors?.to && 'border-destructive'
                )}
                aria-invalid={isCustom && dateErrors?.to ? true : undefined}
              />
              {isCustom && dateErrors?.to ? (
                <p className={fieldError}>{dateErrors.to}</p>
              ) : null}
            </div>
          </div>

          <Button
            type='submit'
            className='h-10 shrink-0 gap-2 bg-[#3B82F6] px-5 hover:bg-[#2563EB] disabled:opacity-50'
            disabled={generateDisabled}
          >
            <RefreshCw className={cn('size-4', isGenerating && 'animate-spin')} aria-hidden />
            Generate Report
          </Button>
        </div>

        {isCustom && dateErrors?.general ? (
          <p className={fieldError}>{dateErrors.general}</p>
        ) : null}

        {scope === 'batch' ? (
          <div className='flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 dark:border-border sm:flex-row sm:items-center'>
            <div className='flex shrink-0 items-center gap-2'>
              <Filter className='size-4 text-[#667085] dark:text-muted-foreground' aria-hidden />
              <span className={LABEL_SM}>Filters</span>
            </div>

            <Select value={status} onValueChange={(v) => onChange({ status: v })}>
              <SelectTrigger
                className='h-10 w-full min-w-[10rem] border-[#D0D5DD] bg-white sm:w-44 dark:border-border dark:bg-background'
                aria-label='Batch status'
              >
                <SelectValue placeholder='All status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All status</SelectItem>
                <SelectItem value='ACTIVE'>Active</SelectItem>
                <SelectItem value='INACTIVE'>Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </form>
    </div>
  );
}
