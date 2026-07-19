'use client';

import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className='text-muted-foreground mb-1 block text-xs font-medium'>{label}</label>
      {children}
    </div>
  );
}

export function SimpleFilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='h-8'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className='capitalize'>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const ACTION_OPTIONS = [
  'all',
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'export',
  'import',
].map((v) => ({ value: v, label: v === 'all' ? 'All actions' : v }));

export const SEVERITY_OPTIONS = ['all', 'info', 'warning', 'error', 'critical'].map((v) => ({
  value: v,
  label: v === 'all' ? 'All levels' : v,
}));

export const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];
