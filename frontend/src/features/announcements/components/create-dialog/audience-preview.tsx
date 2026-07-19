'use client';

import { Icons } from '@/components/icons';
import type { AnnouncementTargetType } from '../../api/types';

type Preview = {
  count: number;
  shardCount?: number;
  sample: { name: string }[];
} | null;

type Props = {
  previewReady: boolean;
  previewLoading: boolean;
  audiencePreview: Preview;
};

export function AudiencePreviewCard({
  previewReady,
  previewLoading,
  audiencePreview,
}: Props) {
  return (
    <section
      aria-labelledby='audience-preview-heading'
      className='rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-background to-background p-4'
    >
      <div className='flex items-start gap-3'>
        <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <Icons.user className='size-4' aria-hidden />
        </div>
        <div className='min-w-0 flex-1'>
          <h3 id='audience-preview-heading' className='text-sm font-semibold text-foreground'>
            Who will see this?
          </h3>
          <div aria-live='polite' className='mt-1 text-xs text-muted-foreground'>
            {!previewReady && <p>Choose a reach above to preview the audience.</p>}
            {previewReady && previewLoading && <p>Calculating reach…</p>}
            {previewReady && !previewLoading && audiencePreview ? (
              <>
                <p className='text-foreground'>
                  <strong className='text-2xl font-semibold tabular-nums tracking-tight'>
                    {audiencePreview.count}
                  </strong>{' '}
                  <span className='text-muted-foreground'>
                    recipient{audiencePreview.count === 1 ? '' : 's'}
                    {audiencePreview.shardCount && audiencePreview.shardCount > 1
                      ? ` · ${audiencePreview.shardCount} targets`
                      : ''}
                  </span>
                </p>
                {audiencePreview.sample.length > 0 ? (
                  <p className='mt-1'>
                    Including {audiencePreview.sample.map((u) => u.name).join(', ')}
                    {audiencePreview.count > audiencePreview.sample.length
                      ? ` and ${audiencePreview.count - audiencePreview.sample.length} more`
                      : ''}
                    .
                  </p>
                ) : null}
                {audiencePreview.count === 0 ? (
                  <p className='mt-1 text-amber-600 dark:text-amber-400'>
                    No active users match this targeting. Double-check the scope before publishing.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export type ReachOption = { value: AnnouncementTargetType; label: string; hint: string };
