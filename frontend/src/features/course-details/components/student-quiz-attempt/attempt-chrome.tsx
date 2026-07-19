'use client';

import { AlertTriangle, Clock, Eye, ShieldAlert } from 'lucide-react';
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

export function AttemptHeader({
  title,
  totalPoints,
  questionCount,
  remaining
}: {
  title: string;
  totalPoints: number;
  questionCount: number;
  remaining: number;
}) {
  return (
    <div className='flex items-start justify-between gap-4 pb-1'>
      <div className='min-w-0'>
        <h2 className='text-2xl font-bold leading-tight truncate'>{title}</h2>
        <p className='text-sm text-muted-foreground mt-0.5'>
          {totalPoints} points &bull; {questionCount} questions
        </p>
      </div>
      <div
        className={`shrink-0 flex items-center gap-1.5 border rounded-lg px-3 py-1.5 tabular-nums font-semibold text-sm ${
          remaining < 60
            ? 'border-destructive/50 text-destructive'
            : 'border-warning text-warning'
        }`}
        role='timer'
        aria-live={remaining < 60 ? 'assertive' : 'off'}
      >
        <Clock className='w-4 h-4' />
        {formatSeconds(remaining)}
      </div>
    </div>
  );
}

export function AntiCheatBanner({ maxWarnings }: { maxWarnings: number }) {
  return (
    <div className='rounded-lg bg-warning-muted border border-warning p-4'>
      <div className='flex items-start gap-2'>
        <ShieldAlert className='w-5 h-5 text-warning shrink-0 mt-0.5' />
        <div className='space-y-1.5'>
          <p className='font-semibold text-sm text-warning-foreground'>
            Important Anti-Cheating Instructions:
          </p>
          <ul className='list-disc pl-4 space-y-0.5 text-sm text-warning-foreground'>
            <li>You cannot copy or paste any content during the quiz.</li>
            <li>
              Attempting to leave this tab or close the window is considered
              suspicious.
            </li>
            <li>
              Each tab switch, copy, or paste earns a warning. After{' '}
              {maxWarnings} warnings, your quiz will automatically close and be
              submitted with the answers completed so far.
            </li>
          </ul>
          <p className='text-sm font-bold text-warning-foreground pt-0.5'>
            Your actions are monitored to ensure fairness and academic integrity.
          </p>
        </div>
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
    <div>
      <div className='flex items-center justify-between text-sm font-semibold mb-2'>
        <span>
          Question {currentIdx + 1} of {questionCount}
        </span>
        <span className='text-muted-foreground font-normal'>
          {Math.round(progressPct)}% complete
        </span>
      </div>
      <div className='h-2 rounded-full bg-muted overflow-hidden'>
        <div
          className='h-full bg-primary rounded-full transition-[width] duration-300 ease-out'
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>
      {saveStatus ? (
        <p
          className={`text-[11px] flex items-center gap-1 mt-1 ${saveStatus.tone}`}
          role='status'
          aria-live='polite'
        >
          <saveStatus.icon
            className={`w-3 h-3 ${saveStatus.spin ? 'animate-spin' : ''}`}
          />
          {saveStatus.text}
        </p>
      ) : null}
    </div>
  );
}
