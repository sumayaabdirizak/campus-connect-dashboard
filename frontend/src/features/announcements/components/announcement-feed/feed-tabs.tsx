'use client';

import type { FeedI18n } from './feed-i18n';
import type { FeedTab } from './types';

const tabClass = (active: boolean) =>
  [
    'relative flex-1 min-h-[44px] py-3 text-center text-sm font-medium transition-colors duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active
      ? 'text-neutral-950 dark:text-white'
      : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300'
  ].join(' ');

const activeBar = (
  <span
    aria-hidden
    className='absolute bottom-0 left-1/2 h-0.5 w-14 -translate-x-1/2 rounded-full bg-neutral-900 dark:bg-white'
  />
);

interface FeedTabsProps {
  i18n: FeedI18n;
  currentFilter: FeedTab;
  setCurrentFilter: (tab: FeedTab) => void;
  canManage: boolean;
}

export function FeedTabs({
  i18n,
  currentFilter,
  setCurrentFilter,
  canManage
}: FeedTabsProps) {
  return (
    <div
      role='tablist'
      aria-label={i18n.feedLabel}
      className='flex h-[52px] items-center border-b border-neutral-100 dark:border-neutral-800/80'
    >
      {(
        [
          ['all', i18n.all],
          ['pinned', i18n.pinned],
          ['saved', i18n.saved]
        ] as const
      ).map(([tab, label]) => (
        <button
          key={tab}
          type='button'
          role='tab'
          aria-selected={currentFilter === tab}
          className={tabClass(currentFilter === tab)}
          onClick={() => setCurrentFilter(tab)}
        >
          {label}
          {currentFilter === tab ? activeBar : null}
        </button>
      ))}
      {canManage ? (
        <button
          type='button'
          role='tab'
          aria-selected={currentFilter === 'drafts'}
          className={tabClass(currentFilter === 'drafts')}
          onClick={() => setCurrentFilter('drafts')}
        >
          {i18n.drafts}
          {currentFilter === 'drafts' ? activeBar : null}
        </button>
      ) : null}
    </div>
  );
}
