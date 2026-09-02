'use client';

import { Download, ClipboardCheck } from 'lucide-react';

import { EmptyState } from '../_shared/empty-state';

import type { Assignment, Submission, SubmissionExtension } from '@/lib/course-details/services/assignments-types';
import { serverNowDate } from '@/lib/server-clock';
export type Outcome = 'grade' | 'extend' | 'missing';

export type SubmissionRow = {
  studentId: number;
  student: { id: number; full_name: string; email: string; number: string };
  submission: Submission | null;
};

export type GroupRow = {
  groupId: number;
  groupName: string;
  members: { id: number; full_name: string; email: string; number: string }[];
  submission: Submission | null;
};

export function isSubmissionGraded(sub: Submission | null | undefined): boolean {
  return sub != null && sub.is_reviewed && sub.grade != null;
}

export function SubmissionFileCell({
  submission,
  label
}: {
  submission: Submission | null | undefined;
  label: string;
}) {
  if (!submission?.content_url) {
    return <span className='text-xs text-muted-foreground'>—</span>;
  }

  return (
    <a
      href={submission.content_url}
      target='_blank'
      rel='noreferrer'
      download
      className='inline-flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground'
      title={`Download ${label}`}
      aria-label={`Download ${label}`}
    >
      <Download className='size-4' aria-hidden />
    </a>
  );
}

export type EffectiveDueTarget = {
  studentId?: number;
  groupId?: number | null;
};

/**
 * Effective due date = max(Assignment.due_date, any matching extension's
 * newDueAt). Pass studentId/groupId when there is no submission yet so
 * missing students still reflect granted extensions.
 */
export function effectiveDue(
  a: Assignment,
  sub: Submission | undefined,
  extensions: SubmissionExtension[],
  target?: EffectiveDueTarget
): Date {
  const base = new Date(a.due_date);
  const studentId = sub?.studentId ?? target?.studentId;
  const groupId = sub?.groupId ?? target?.groupId ?? null;
  let latest = base;
  for (const ext of extensions) {
    const targetsMe =
      (ext.studentId != null && studentId != null && ext.studentId === studentId) ||
      (ext.groupId != null && groupId != null && ext.groupId === groupId);
    if (!targetsMe) continue;
    const d = new Date(ext.newDueAt);
    if (d > latest) latest = d;
  }
  return latest;
}

export type SubmissionStatus = 'submitted' | 'late' | 'missing' | 'extended';

function submissionCloseAt(a: Assignment, due: Date): Date {
  return new Date(due.getTime() + (a.lateWindowMinutes ?? 0) * 60_000);
}

export function statusOf(
  a: Assignment,
  sub: Submission | undefined,
  extensions: SubmissionExtension[],
  target?: EffectiveDueTarget
): SubmissionStatus {
  const due = effectiveDue(a, sub, extensions, target);
  if (!sub) {
    const now = serverNowDate();
    const closeAt = submissionCloseAt(a, due);
    const hasExtension = due.getTime() > new Date(a.due_date).getTime();
    if (hasExtension && now <= closeAt) return 'extended';
    return 'missing';
  }
  return new Date(sub.submitted_at) > due ? 'late' : 'submitted';
}

export function AssignmentsLoadingState({ isStudent }: { isStudent?: boolean }) {
  return isStudent ? (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className='rounded-xl bg-muted/40 p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div className='h-3 w-28 animate-pulse rounded bg-muted/70' />
            <div className='h-5 w-16 animate-pulse rounded-full bg-muted/70' />
          </div>
          <div className='mt-3 h-5 w-3/4 animate-pulse rounded bg-muted/70' />
          <div className='mt-3 h-6 w-20 animate-pulse rounded-full bg-muted/50' />
        </div>
      ))}
    </div>
  ) : (
    <div className='space-y-4'>
      <div className='overflow-hidden rounded-3xl border bg-card'>
        <div className='h-44 animate-pulse bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800' />
        <div className='grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-20 animate-pulse rounded-xl bg-muted/70' />
          ))}
        </div>
        <div className='border-t p-4 sm:p-6'>
          <div className='grid gap-3 lg:grid-cols-[1fr_360px]'>
            <div className='h-12 animate-pulse rounded-xl bg-muted/60' />
            <div className='h-12 animate-pulse rounded-xl bg-muted/60' />
          </div>
          <div className='mt-4 overflow-hidden rounded-3xl border bg-background'>
            <div className='h-12 animate-pulse border-b bg-muted/40' />
            <div className='space-y-2 p-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='h-12 animate-pulse rounded-xl bg-muted/40' />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export function AssignmentsEmptyState({
  isStudent,
  hasItems,
  onCreate
}: {
  isStudent?: boolean;
  hasItems: boolean;
  onCreate?: () => void;
}) {
  return (
    <EmptyState
      icon={ClipboardCheck}
      title={hasItems ? 'No matching assignments' : 'No assignments yet'}
      description={
        hasItems
          ? 'Try a different filter or search term to surface more work.'
          : isStudent
            ? "Your teacher hasn't posted any work for this course yet."
            : 'Create the first assignment to start tracking submissions and grades.'
      }
      actionLabel={!isStudent && !hasItems && onCreate ? 'Create assignment' : undefined}
      onAction={onCreate}
    />
  );
}

