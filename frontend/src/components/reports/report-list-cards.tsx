'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ReportScope } from '@/lib/reports/types';
import { CARD, META } from './report-theme';

function primaryLabel(row: Record<string, unknown>, scope: ReportScope): string {
  if (scope === 'course') return String(row.title ?? row.course ?? 'Course');
  if (scope === 'faculty') return String(row.name ?? row.code ?? 'Faculty');
  return String(row.name ?? row.title ?? '—');
}

function subtitle(row: Record<string, unknown>, scope: ReportScope): string {
  if (scope === 'course') {
    const parts = [row.course, row.teacher, row.section].filter(Boolean);
    return parts.map(String).join(' · ');
  }
  if (scope === 'teacher') {
    return `${row.courses ?? 0} courses · ${row.quizzes ?? 0} quizzes · ${row.assignments ?? 0} assignments`;
  }
  if (scope === 'student') {
    return `${row.batch ?? '—'} · ${row.section ?? '—'} · ${row.courses ?? 0} courses`;
  }
  if (scope === 'batch') {
    return `${row.students ?? 0} students · ${row.courses ?? 0} courses`;
  }
  if (scope === 'faculty') {
    return `${row.departments ?? 0} departments · ${row.students ?? 0} students · ${row.courses ?? 0} courses`;
  }
  return '';
}

function statLine(row: Record<string, unknown>, scope: ReportScope): string | null {
  if (scope === 'course') {
    const a = Number(row.attempts ?? 0);
    const s = Number(row.submissions ?? 0);
    if (a === 0 && s === 0 && Number(row.quizzes ?? 0) + Number(row.assignments ?? 0) > 0) {
      return 'No quiz attempts or work handed in yet';
    }
    return `${a} quiz attempts · ${s} work handed in`;
  }
  if (scope === 'student') {
    return `${row.attempts ?? 0} quiz attempts · ${row.submissions ?? 0} work handed in`;
  }
  return null;
}

export function ReportListCards({
  scope,
  plural,
  rows,
  isLoading,
  onOpen,
  toolbar,
  search,
  onSearchChange,
  page,
  pageSize,
  total,
  totalUnfiltered,
  onPageChange
}: {
  scope: ReportScope;
  plural: string;
  rows: Record<string, unknown>[];
  isLoading: boolean;
  onOpen: (id: string) => void;
  toolbar?: React.ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  pageSize: number;
  total: number;
  totalUnfiltered: number;
  onPageChange: (page: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={`overflow-hidden ${CARD}`}>
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3 dark:border-border'>
        <div className='flex flex-1 flex-wrap items-center gap-3'>
          <div className='relative w-full max-w-sm'>
            <Search
              className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#667085]'
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${plural}…`}
              className='h-9 border-[#D0D5DD] bg-white pl-8 dark:border-border dark:bg-background'
              aria-label={`Search ${plural}`}
            />
          </div>
          {toolbar}
        </div>
        <span className={`tabular-nums ${META}`}>
          {isLoading
            ? 'Loading…'
            : `${from}–${to} of ${total}${
                total !== totalUnfiltered ? ` (from ${totalUnfiltered})` : ''
              }`}
        </span>
      </div>

      {isLoading ? (
        <p className='px-4 py-12 text-center text-sm text-[#667085]'>Loading…</p>
      ) : rows.length === 0 ? (
        <p className='px-4 py-12 text-center text-sm text-[#667085]'>
          {totalUnfiltered === 0 ? 'Nothing to show yet.' : 'No matches. Try another search.'}
        </p>
      ) : (
        <ul className='divide-y divide-[#E5E7EB] dark:divide-border'>
          {rows.map((row, i) => {
            const id = String(row.id ?? i);
            const hint = statLine(row, scope);
            return (
              <li
                key={id}
                className='flex flex-wrap items-center justify-between gap-3 px-4 py-3.5'
              >
                <div className='min-w-0 flex-1'>
                  <p className='font-medium text-[#101828] dark:text-foreground'>
                    {primaryLabel(row, scope)}
                  </p>
                  <p className='mt-0.5 text-sm text-[#667085] dark:text-muted-foreground'>
                    {subtitle(row, scope)}
                  </p>
                  {hint ? (
                    <p className='mt-1 text-xs text-[#98A2B3] dark:text-muted-foreground/80'>
                      {hint}
                    </p>
                  ) : null}
                </div>
                <Button
                  type='button'
                  size='sm'
                  className='shrink-0 rounded-full bg-[#3B82F6] px-4 text-white hover:bg-[#2563EB]'
                  onClick={() => onOpen(id)}
                >
                  View report
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {lastPage > 1 && !isLoading ? (
        <div className='flex items-center justify-between gap-3 border-t border-[#E5E7EB] px-4 py-3 dark:border-border'>
          <span className={META}>
            Page {page} of {lastPage}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 gap-1 border-[#D0D5DD] dark:border-border'
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className='size-4' /> Back
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 gap-1 border-[#D0D5DD] dark:border-border'
              disabled={page >= lastPage}
              onClick={() => onPageChange(page + 1)}
            >
              Next <ChevronRight className='size-4' />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
