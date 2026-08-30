'use client';

import { Icons } from '@/components/icons';

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
      className='rounded-xl border-2 border-primary/40 bg-card p-4 shadow-md'
    >
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <Icons.user className='size-5' aria-hidden />
        </div>
        <div className='min-w-0 flex-1'>
          <h3 id='audience-preview-heading' className='text-sm font-semibold text-foreground'>
            Estimated reach
          </h3>
          <div aria-live='polite' className='mt-1.5 text-sm'>
            {!previewReady && (
              <p className='text-muted-foreground'>Choose a reach option above to see the count.</p>
            )}
            {previewReady && previewLoading && (
              <p className='text-muted-foreground'>Calculating…</p>
            )}
            {previewReady && !previewLoading && audiencePreview ? (
              <>
                <p className='text-foreground'>
                  <strong className='text-3xl font-bold tabular-nums tracking-tight'>
                    {audiencePreview.count}
                  </strong>
                  <span className='ms-1.5 text-muted-foreground'>
                    people
                    {audiencePreview.shardCount && audiencePreview.shardCount > 1
                      ? ` · ${audiencePreview.shardCount} targets`
                      : ''}
                  </span>
                </p>
                {audiencePreview.sample.length > 0 ? (
                  <p className='mt-1 text-xs text-muted-foreground'>
                    e.g. {audiencePreview.sample.map((u) => u.name).join(', ')}
                    {audiencePreview.count > audiencePreview.sample.length
                      ? ` and ${audiencePreview.count - audiencePreview.sample.length} more`
                      : ''}
                  </p>
                ) : null}
                {audiencePreview.count === 0 ? (
                  <p className='mt-2 text-xs font-medium text-amber-700 dark:text-amber-400'>
                    No active users match. Adjust your reach before publishing.
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

export type ReachOption = { value: string; label: string; hint: string };
