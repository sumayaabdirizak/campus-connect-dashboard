'use client';

import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Search } from 'lucide-react';
import type { Assignment, SubmissionExtension } from '../../api/assignments-types';
import { statusOf, type GroupRow, type SubmissionRow } from './shared';
import type { SubmissionFilter } from './use-submission-rows';

export function SubmissionsFilters({
  filter,
  setFilter,
  search,
  setSearch,
  isGroupMode,
  allGroupRows,
  allStudentRows,
  assignment,
  extensions
}: {
  filter: SubmissionFilter;
  setFilter: (f: SubmissionFilter) => void;
  search: string;
  setSearch: (v: string) => void;
  isGroupMode: boolean;
  allGroupRows: GroupRow[];
  allStudentRows: SubmissionRow[];
  assignment: Assignment;
  extensions: SubmissionExtension[];
}) {
  return (
    <div className='flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between'>
      <SegmentedControl
        ariaLabel='Filter submissions by submission status'
        value={(
          ['all', 'submitted', 'late', 'missing'] as const
        ).includes(filter as 'all' | 'submitted' | 'late' | 'missing')
          ? (filter as 'all' | 'submitted' | 'late' | 'missing')
          : 'all'}
        onChange={setFilter}
        options={(['all', 'submitted', 'late', 'missing'] as const).map((f) => ({
          value: f,
          label: <span className='capitalize'>{f}</span>,
          count: isGroupMode
            ? f === 'all'
              ? allGroupRows.length
              : f === 'submitted'
                ? allGroupRows.filter((r) => r.submission !== null).length
                : f === 'missing'
                  ? allGroupRows.filter((r) => r.submission === null).length
                  : allGroupRows.filter((r) => r.submission?.is_late).length
            : f === 'all'
              ? allStudentRows.length
              : allStudentRows.filter(
                  (r) => statusOf(assignment, r.submission ?? undefined, extensions) === f
                ).length
        }))}
      />
      <SegmentedControl
        ariaLabel='Filter submissions by review status'
        value={(['ungraded', 'graded'] as const).includes(filter as 'ungraded' | 'graded')
          ? (filter as 'ungraded' | 'graded')
          : 'ungraded'}
        onChange={setFilter}
        options={(['ungraded', 'graded'] as const).map((f) => ({
          value: f,
          label: <span className='capitalize'>{f}</span>,
          count: (isGroupMode ? allGroupRows : allStudentRows).filter((r) =>
            f === 'graded'
              ? (r.submission?.is_reviewed ?? false)
              : !(r.submission?.is_reviewed ?? false)
          ).length
        }))}
      />
      <div className='relative w-full xl:max-w-sm'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
        <Input
          placeholder='Search students…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-10 h-8'
        />
      </div>
    </div>
  );
}
