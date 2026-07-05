'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  AdminFaculty,
  AdminReportPeriod,
  PlatformAnalytics,
} from '@/features/admin/api/admin-api';

export interface AdminReportFilterState {
  facultyId: number | null;
  period: AdminReportPeriod;
}

interface AdminReportFiltersProps {
  faculties: AdminFaculty[];
  value: AdminReportFilterState;
  onChange: (next: AdminReportFilterState) => void;
  loadingFaculties?: boolean;
  disabled?: boolean;
}

const PERIOD_OPTIONS: { value: AdminReportPeriod; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
];

export function AdminReportFilters({
  faculties,
  value,
  onChange,
  loadingFaculties,
  disabled,
}: AdminReportFiltersProps) {
  const hasActiveFilters = value.facultyId != null || value.period !== '6m';

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Select
        value={value.facultyId != null ? String(value.facultyId) : 'all'}
        onValueChange={(v) =>
          onChange({
            ...value,
            facultyId: v === 'all' ? null : Number(v),
          })
        }
        disabled={disabled || loadingFaculties}
      >
        <SelectTrigger size='sm' className='min-w-[160px] bg-card'>
          <SelectValue placeholder='Faculty' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All faculties</SelectItem>
          {faculties.map((f) => (
            <SelectItem key={f.id} value={String(f.id)}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.period}
        onValueChange={(v) =>
          onChange({
            ...value,
            period: v as AdminReportPeriod,
          })
        }
        disabled={disabled}
      >
        <SelectTrigger size='sm' className='min-w-[140px] bg-card'>
          <SelectValue placeholder='Period' />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters ? (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1.5 px-2 text-muted-foreground'
          disabled={disabled}
          onClick={() => onChange({ facultyId: null, period: '6m' })}
        >
          <RotateCcw className='size-3.5' aria-hidden />
          Reset
        </Button>
      ) : null}
    </div>
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
