import React from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { motion } from 'framer-motion';

interface AnnouncementEmptyProps {
  hasFilters?: boolean;
  onClearFilters?: () => void;
  /** Creator-only Scheduled tab: no upcoming scheduled posts. */
  scheduledTabEmpty?: boolean;
  /** Creator-only Drafts tab: no saved drafts. */
  draftsTabEmpty?: boolean;
}

export function AnnouncementEmpty({
  hasFilters,
  onClearFilters,
  scheduledTabEmpty,
  draftsTabEmpty
}: AnnouncementEmptyProps) {
  const title = hasFilters
    ? 'No matches'
    : scheduledTabEmpty
      ? 'No scheduled announcements'
      : draftsTabEmpty
        ? 'No drafts yet'
        : 'No announcements yet';
  const description = hasFilters
    ? 'Try widening your filters or clearing the search to see more posts.'
    : scheduledTabEmpty
      ? 'When you use "Schedule for later" in the composer, those posts show up here until they go live. Nothing is queued right now.'
      : draftsTabEmpty
        ? 'Save a post as a draft from the composer to resume it here. Drafts are only visible to you.'
        : 'When your department posts a notice, it will appear here in your feed.';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='relative overflow-hidden rounded-3xl border border-dashed border-border/70 bg-gradient-to-br from-muted/30 via-background to-background py-20 text-center'
    >
      <span aria-hidden className='pointer-events-none absolute inset-x-1/2 -top-12 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl' />
      <div className='relative mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/60'>
        <Icons.speakerphone className='size-7 text-primary/60' aria-hidden />
      </div>
      <h3 className='relative mb-2 text-lg font-semibold tracking-tight text-foreground'>{title}</h3>
      <p className='relative mx-auto mb-6 max-w-sm px-6 text-sm leading-relaxed text-muted-foreground'>
        {description}
      </p>

      {hasFilters && (
        <Button
          variant='outline'
          onClick={onClearFilters}
          className='relative h-10 rounded-full px-5 text-sm'
        >
          <Icons.xCircle className='me-2 size-4' aria-hidden /> Clear filters
        </Button>
      )}
    </motion.div>
  );
}
