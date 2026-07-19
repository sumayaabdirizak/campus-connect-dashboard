'use client';

import { RotateCcw } from 'lucide-react';
import type {
  AuditActionType,
  AuditSeverity,
  AuditStatus,
} from '@/features/admin/api/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuditLogFilterState } from './audit-filters';
import {
  ACTION_OPTIONS,
  FilterField,
  PERIOD_OPTIONS,
  SEVERITY_OPTIONS,
  SimpleFilterSelect,
} from './audit-filter-fields';

interface ActorOption {
  id: number;
  fullName: string;
}

interface AuditLogsFiltersBarProps {
  draft: AuditLogFilterState;
  setDraft: (next: AuditLogFilterState) => void;
  actors: ActorOption[];
  hasActiveFilters: boolean;
  onApply: () => void;
  onReset: () => void;
}

export function AuditLogsFiltersBar({
  draft,
  setDraft,
  actors,
  hasActiveFilters,
  onApply,
  onReset,
}: AuditLogsFiltersBarProps) {
  return (
    <div className='shrink-0 border-b p-2'>
      <div className='flex flex-wrap items-end gap-2'>
        <FilterField label='Search' className='min-w-[180px] flex-1'>
          <Input
            value={draft.search}
            onChange={(e) => setDraft({ ...draft, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onApply()}
            placeholder='Search actions, users, modules…'
            className='h-8'
          />
        </FilterField>
        <FilterField label='User' className='w-[150px]'>
          <Select
            value={draft.actorId != null ? String(draft.actorId) : 'all'}
            onValueChange={(v) =>
              setDraft({ ...draft, actorId: v === 'all' ? null : Number(v) })
            }
          >
            <SelectTrigger className='h-8'>
              <SelectValue placeholder='All users' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All users</SelectItem>
              {actors.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label='Action' className='w-[130px]'>
          <SimpleFilterSelect
            value={draft.actionType}
            onChange={(v) => setDraft({ ...draft, actionType: v as AuditActionType })}
            options={ACTION_OPTIONS}
          />
        </FilterField>
        <FilterField label='Severity' className='w-[120px]'>
          <SimpleFilterSelect
            value={draft.severity}
            onChange={(v) => setDraft({ ...draft, severity: v as AuditSeverity })}
            options={SEVERITY_OPTIONS}
          />
        </FilterField>
        <FilterField label='Status' className='w-[110px]'>
          <Select
            value={draft.status}
            onValueChange={(v) => setDraft({ ...draft, status: v as AuditStatus })}
          >
            <SelectTrigger className='h-8'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All status</SelectItem>
              <SelectItem value='success'>Success</SelectItem>
              <SelectItem value='failed'>Failed</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label='Date range' className='w-[130px]'>
          <SimpleFilterSelect
            value={draft.period}
            onChange={(v) =>
              setDraft({ ...draft, period: v as AuditLogFilterState['period'] })
            }
            options={PERIOD_OPTIONS}
          />
        </FilterField>
        <Button type='button' size='sm' className='h-8' onClick={onApply}>
          Apply
        </Button>
        {hasActiveFilters ? (
          <Button type='button' variant='ghost' size='sm' className='h-8' onClick={onReset}>
            <RotateCcw className='mr-1.5 size-3.5' />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
