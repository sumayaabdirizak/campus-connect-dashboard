'use client';

import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';
import type { SubmissionSortKey } from './use-submission-rows';

type Props = {
  label: string;
  sortKey: SubmissionSortKey;
  subSort: { key: SubmissionSortKey; dir: 'asc' | 'desc' };
  onSort: (key: SubmissionSortKey) => void;
};

export function SubmissionsSortHeader({ label, sortKey, subSort, onSort }: Props) {
  const active = subSort.key === sortKey;
  return (
    <button
      type='button'
      onClick={() => onSort(sortKey)}
      className='inline-flex items-center gap-1 hover:text-foreground transition-colors'
    >
      {label}
      {active ? (
        subSort.dir === 'asc' ? (
          <ChevronUp className='w-3 h-3' />
        ) : (
          <ChevronDown className='w-3 h-3' />
        )
      ) : (
        <ArrowUpDown className='w-3 h-3 opacity-30' />
      )}
    </button>
  );
}
