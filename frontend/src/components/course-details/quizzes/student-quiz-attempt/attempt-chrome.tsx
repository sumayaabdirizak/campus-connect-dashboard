'use client';

import { AlertTriangle, Clock, Eye, Shield } from 'lucide-react';
import { formatSeconds } from '../course-quizzes-utils';
import { getSaveStatus } from './save-status';

export function PreviewBanner() {
  return (
    <div className='rounded-lg border border-warning bg-warning-muted text-warning-foreground px-3 py-2 text-sm flex items-center gap-2'>
      <Eye className='w-4 h-4 shrink-0' />
      <span>
        <strong>Preview mode</strong> — answers and timer don&apos;t persist. This
        is exactly what students see.
      </span>
    </div>
  );
}

/** Compact strip so proctoring is visible during a live demo. */
export function ProctoringBanner({
  warnings,
  maxWarnings
}: {
  warnings: number;
  maxWarnings: number;
}) {
  return (
    <div className='rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm flex items-start gap-2'>
      <Shield className='w-4 h-4 shrink-0 mt-0.5 text-muted-foreground' />
      <div className='min-w-0'>
        <p className='font-medium text-foreground'>Proctoring active</p>
        <p className='text-xs text-muted-foreground'>
          Tab switches and screenshot attempts are detected and logged
          {warnings > 0
            ? ` · ${warnings} of ${maxWarnings} warnings`
            : ''}
          .
        </p>
      </div>
    </div>
  );
}

export function AttemptHeader({
  title,
  questionCount,
  remaining
}: {
  title: string;
  totalPoints: number;
  questionCount: number;
  remaining: number;
}) {
  // A timer that's amber from second one has spent its warning colour before
  // there's anything to warn about. Stay neutral, then turn red at two
  // minutes so the change actually means something.
  const urgent = remaining < 120;

  return (
    <div className='flex items-center justify-between gap-4'>
      <div className='min-w-0'>
        <h2 className='truncate text-lg font-semibold leading-tight'>{title}</h2>
        <p className='mt-0.5 text-sm text-muted-foreground'>
          {questionCount} {questionCount === 1 ? 'question' : 'questions'}
        </p>
      </div>
      <div
        className={`flex h-12 shrink-0 items-center gap-2 rounded-xl border px-4 tabular-nums text-base font-semibold ${
          urgent ? 'border-destructive/50 text-destructive' : 'border-border text-foreground'
        }`}
        role='timer'
        aria-live={remaining < 60 ? 'assertive' : 'off'}
      >
        <Clock className='size-4' />
        {formatSeconds(remaining)}
      </div>
    </div>
  );
}

export function MultiTabBanner() {
  return (
    <div className='rounded-lg border border-destructive/40 bg-destructive/5 text-destructive px-3 py-2 text-sm flex items-start gap-2'>
      <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
      <div>
        <p className='font-medium'>This quiz is open in another tab.</p>
        <p className='text-xs'>
          Close one tab to avoid answers overwriting each other.
        </p>
      </div>
    </div>
  );
}

export function ProgressBlock({
  currentIdx,
  questionCount,
  progressPct,
  saveOpts
}: {
  currentIdx: number;
  questionCount: number;
  progressPct: number;
  saveOpts: Parameters<typeof getSaveStatus>[0];
}) {
  const saveStatus = getSaveStatus(saveOpts);
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium text-foreground'>
          Question {currentIdx + 1} of {questionCount}
        </span>
        <span className='text-muted-foreground'>{Math.round(progressPct)}% done</span>
      </div>
      <div className='h-2 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out'
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>
      {saveStatus ? (
        <p
          className={`mt-1 flex items-center gap-1 text-xs ${saveStatus.tone}`}
          role='status'
          aria-live='polite'
        >
          <saveStatus.icon className={`size-3 ${saveStatus.spin ? 'animate-spin' : ''}`} />
          {saveStatus.text}
        </p>
      ) : null}
    </div>
  );
}
