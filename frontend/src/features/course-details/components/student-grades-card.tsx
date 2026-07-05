'use client';

import { GraduationCap, FileText, ClipboardCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMyGrades } from '../api/gradebook-queries';
import type { MyGradeItem } from '../api/gradebook-types';

interface StudentGradesCardProps {
  courseId: string;
}

function fmtPct(pct: number | null | undefined): string {
  return pct == null ? '—' : `${Math.round(pct)}%`;
}

function GradeRow({ item }: { item: MyGradeItem }) {
  const Icon = item.kind === 'quiz' ? ClipboardCheck : FileText;
  const isAssignment = item.kind === 'assignment';

  let value: string;
  let pending = false;

  if (isAssignment) {
    if (item.grade != null) value = `${item.grade}/${item.maxMarks}`;
    else if (item.submitted) {
      value = 'Submitted';
      pending = true;
    } else value = 'Not submitted';
  } else if (item.pct != null) {
    value = fmtPct(item.pct);
  } else {
    value = 'Not taken';
  }

  const pct = item.pct ?? (item.grade != null && item.maxMarks ? (item.grade / item.maxMarks) * 100 : null);
  const barWidth = pct == null ? 0 : Math.max(0, Math.min(100, pct));

  return (
    <div className='flex items-center gap-3 py-3'>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          isAssignment ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
        )}
      >
        <Icon className='size-4' aria-hidden />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <p className='truncate text-sm font-medium'>{item.title}</p>
          {item.late ? (
            <Badge variant='outline' className='h-4 shrink-0 px-1 text-[9px]'>
              Late
            </Badge>
          ) : null}
          {pending ? (
            <Badge variant='secondary' className='h-4 shrink-0 px-1 text-[9px]'>
              Pending
            </Badge>
          ) : null}
        </div>
        {pct != null ? (
          <div className='mt-1.5 h-1 max-w-[8rem] overflow-hidden rounded-full bg-muted'>
            <div className='h-full rounded-full bg-primary' style={{ width: `${barWidth}%` }} />
          </div>
        ) : null}
      </div>
      <span className='shrink-0 text-sm font-medium tabular-nums text-muted-foreground'>
        {value}
      </span>
    </div>
  );
}

export function StudentGradesCard({ courseId }: StudentGradesCardProps) {
  const { data, isLoading, isError } = useMyGrades(courseId);

  if (isLoading) {
    return (
      <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
        <Skeleton className='h-16 w-full rounded-none' />
        <div className='space-y-3 p-4'>
          <Skeleton className='h-12 w-full' />
          <Skeleton className='h-12 w-full' />
        </div>
      </div>
    );
  }

  if (isError || !data || data.totalItems === 0) return null;

  const overallWidth =
    data.overallPct == null ? 0 : Math.max(0, Math.min(100, data.overallPct));

  return (
    <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
      <div className='grid grid-cols-2 divide-x border-b bg-muted/30'>
        <div className='px-4 py-3'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Course average
          </p>
          <p className='mt-0.5 text-2xl font-semibold tabular-nums'>{fmtPct(data.overallPct)}</p>
          <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-muted'>
            <div
              className='h-full rounded-full bg-primary'
              style={{ width: `${overallWidth}%` }}
            />
          </div>
        </div>
        <div className='flex flex-col justify-center px-4 py-3'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Progress
          </p>
          <p className='mt-0.5 text-sm font-medium tabular-nums'>
            {data.gradedCount} / {data.totalItems} graded
          </p>
          <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
            <GraduationCap className='size-3.5' aria-hidden />
            Your grades
          </p>
        </div>
      </div>

      <div className='divide-y px-4'>
        {data.items.map((item) => (
          <GradeRow key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}
