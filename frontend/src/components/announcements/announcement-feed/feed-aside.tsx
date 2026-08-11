'use client';

import type { FeedI18n } from './feed-i18n';

interface FeedAsideProps {
  i18n: FeedI18n;
  unreadCount: number;
  pinnedCount: number;
}

export function FeedAside({ i18n, unreadCount, pinnedCount }: FeedAsideProps) {
  return (
    <aside
      aria-label={`${i18n.unreadHeading} & ${i18n.pinnedHeading}`}
      className='mx-auto hidden w-full max-w-xs shrink-0 lg:mx-0 lg:block lg:max-w-[260px] lg:self-start'
    >
      <div className='space-y-3 lg:sticky lg:top-4'>
        <section
          aria-labelledby='announcements-unread-heading'
          className='relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/8 via-background to-background p-5 shadow-sm backdrop-blur'
        >
          <span
            aria-hidden
            className='pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl'
          />
          <h2
            id='announcements-unread-heading'
            className='text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'
          >
            {i18n.unreadHeading}
          </h2>
          <p
            className='mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground'
            aria-label={i18n.unreadAnnounce(unreadCount)}
          >
            {unreadCount}
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {unreadCount === 0
              ? "You're all caught up."
              : 'announcement' + (unreadCount === 1 ? '' : 's') + ' to read'}
          </p>
        </section>
        <section
          aria-labelledby='announcements-pinned-heading'
          className='rounded-2xl border border-border/60 bg-background/80 p-5 shadow-sm backdrop-blur'
        >
          <h2
            id='announcements-pinned-heading'
            className='text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground'
          >
            {i18n.pinnedHeading}
          </h2>
          <p className='mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground'>
            {pinnedCount}
          </p>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
            {pinnedCount === 0
              ? 'No pinned posts right now.'
              : `pinned announcement${pinnedCount === 1 ? '' : 's'} at the top`}
          </p>
        </section>
      </div>
    </aside>
  );
}
