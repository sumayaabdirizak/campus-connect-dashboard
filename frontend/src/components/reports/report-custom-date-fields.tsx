'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  GlobalFilterField,
  GLOBAL_FILTER_CONTROL
} from '@/components/reports/global-report-filters';

type Props = {
  from: string | null;
  to: string | null;
  minDate: string | null;
  maxDate: string | null;
  onChange: (patch: { from?: string | null; to?: string | null }) => void;
  hint?: string | null;
  disabled?: boolean;
};

/**
 * Custom report date range clamped to active semester start … today.
 */
export function ReportCustomDateFields({
  from,
  to,
  minDate,
  maxDate,
  onChange,
  hint,
  disabled
}: Props) {
  const fromMax = to && maxDate && to < maxDate ? to : (maxDate ?? undefined);
  const toMin = from ?? minDate ?? undefined;

  return (
    <>
      <GlobalFilterField label='From'>
        <Input
          type='date'
          disabled={disabled}
          value={from ?? ''}
          min={minDate ?? undefined}
          max={fromMax}
          onChange={(e) => onChange({ from: e.target.value || null })}
          className={cn(GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>
      <GlobalFilterField label='To'>
        <Input
          type='date'
          disabled={disabled}
          value={to ?? ''}
          min={toMin}
          max={maxDate ?? undefined}
          onChange={(e) => onChange({ to: e.target.value || null })}
          className={cn(GLOBAL_FILTER_CONTROL)}
        />
      </GlobalFilterField>
      {hint ? (
        <p className='text-xs text-muted-foreground sm:col-span-2 xl:col-span-4'>
          {hint}
        </p>
      ) : null}
    </>
  );
}
