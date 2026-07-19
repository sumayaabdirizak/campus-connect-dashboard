'use client';

import { Button } from '@/components/ui/button';

import { Plus, Download, ClipboardCheck } from 'lucide-react';

import type { Assignment, Submission, SubmissionExtension } from '../../api/assignments-types';
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

/**
 * Effective due date for a given submission = max(Assignment.due_date, any
 * matching extension's newDueAt). Status badges (submitted / late / missing)
 * derive from this so granting extra time un-flags "late" automatically.
 */
export function effectiveDue(
  a: Assignment,
  sub: Submission | undefined,
  extensions: SubmissionExtension[]
): Date {
  const base = new Date(a.due_date);
  if (!sub) return base;
  let latest = base;
  for (const ext of extensions) {
    const targetsMe =
      (ext.studentId != null && ext.studentId === sub.studentId) ||
      (ext.groupId != null && sub.groupId != null && ext.groupId === sub.groupId);
    if (!targetsMe) continue;
    const d = new Date(ext.newDueAt);
    if (d > latest) latest = d;
  }
  return latest;
}

export function statusOf(
  a: Assignment,
  sub: Submission | undefined,
  extensions: SubmissionExtension[]
): 'submitted' | 'late' | 'missing' {
  if (!sub) return 'missing';
  const due = effectiveDue(a, sub, extensions);
  return new Date(sub.submitted_at) > due ? 'late' : 'submitted';
}

export function AssignmentsLoadingState({ isStudent }: { isStudent?: boolean }) {
  return isStudent ? (
    <div className='space-y-4'>
      <div className='rounded-xl border bg-card p-4 shadow-sm'>
        <div className='mb-3 h-4 w-28 animate-pulse rounded bg-muted/70' />
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='h-10 animate-pulse rounded bg-muted/50' />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className='overflow-hidden rounded-2xl border bg-card p-4 shadow-sm'>
          <div className='flex items-start justify-between gap-3'>
            <div className='h-4 w-1/2 animate-pulse rounded bg-muted/70' />
            <div className='h-6 w-20 animate-pulse rounded-full bg-muted/70' />
          </div>
          <div className='mt-3 h-3 w-5/6 animate-pulse rounded bg-muted/50' />
          <div className='mt-4 grid gap-2 sm:grid-cols-3'>
            <div className='h-10 animate-pulse rounded-xl bg-muted/50' />
            <div className='h-10 animate-pulse rounded-xl bg-muted/50' />
            <div className='h-10 animate-pulse rounded-xl bg-muted/50' />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className='space-y-4'>
      <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
        <div className='h-44 animate-pulse bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800' />
        <div className='grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-20 animate-pulse rounded-2xl bg-muted/70' />
          ))}
        </div>
        <div className='border-t p-4 sm:p-6'>
          <div className='grid gap-3 lg:grid-cols-[1fr_360px]'>
            <div className='h-12 animate-pulse rounded-2xl bg-muted/60' />
            <div className='h-12 animate-pulse rounded-2xl bg-muted/60' />
          </div>
          <div className='mt-4 overflow-hidden rounded-3xl border bg-background'>
            <div className='h-12 animate-pulse border-b bg-muted/40' />
            <div className='space-y-2 p-4'>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className='h-12 animate-pulse rounded-2xl bg-muted/40' />
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
    <div className='overflow-hidden rounded-3xl border bg-card shadow-sm'>
      <div className='bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-4 py-5 text-white sm:px-6'>
        <div className='flex items-center gap-2'>
          <ClipboardCheck className='size-4' />
          <p className='text-sm font-semibold'>Assignments</p>
        </div>
        <p className='mt-2 max-w-2xl text-sm text-white/75'>
          {isStudent
            ? 'When your instructor publishes work, the assignment workspace will show it here.'
            : 'Use the assignment workspace to publish, filter, and grade coursework for this section.'}
        </p>
      </div>
      <div className='flex flex-col items-center justify-center px-6 py-12 text-center'>
        <div className='mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground'>
          <ClipboardCheck className='size-6' />
        </div>
        <h3 className='text-lg font-semibold tracking-tight'>
          {hasItems ? 'No matching assignments' : 'No assignments yet'}
        </h3>
        <p className='mt-2 max-w-md text-sm text-muted-foreground'>
          {hasItems
            ? 'Try a different filter or search term to surface more work.'
            : isStudent
              ? "Your teacher hasn't posted any work for this course yet."
              : 'Create the first assignment to start tracking submissions and grades.'}
        </p>
        {!isStudent && !hasItems && onCreate && (
          <Button className='mt-5 gap-1.5' onClick={onCreate}>
            <Plus className='size-4' /> Create assignment
          </Button>
        )}
      </div>
    </div>
  );
}

