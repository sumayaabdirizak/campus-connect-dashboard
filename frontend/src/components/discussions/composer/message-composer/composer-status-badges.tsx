'use client';

import { Icons } from '@/components/icons';

interface ComposerStatusBadgesProps {
  effectiveAskAsQuestion: boolean;
  effectivePostAnonymously: boolean;
  slashActive: boolean;
}

export function ComposerStatusBadges({
  effectiveAskAsQuestion,
  effectivePostAnonymously,
  slashActive
}: ComposerStatusBadgesProps) {
  if (!effectiveAskAsQuestion && !effectivePostAnonymously) return null;
  return (
    <div className='mb-2 flex flex-wrap items-center gap-1.5'>
      {effectiveAskAsQuestion ? (
        <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
          <Icons.help className='h-3 w-3' />
          Posting as Question
        </span>
      ) : null}
      {effectivePostAnonymously ? (
        <span className='inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300'>
          <Icons.user className='h-3 w-3' />
          Anonymous
        </span>
      ) : null}
      {slashActive ? (
        <span className='text-[10px] text-muted-foreground'>
          triggered by <code className='rounded bg-muted px-1 font-mono'>/qa</code>
        </span>
      ) : null}
    </div>
  );
}
