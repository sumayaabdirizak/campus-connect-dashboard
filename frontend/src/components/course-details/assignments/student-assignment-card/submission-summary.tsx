'use client';

import { Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { Submission } from '@/lib/course-details/services/assignments-types';

export function SubmissionSummary({
  submission,
  isGroupAssignment,
  isGraded,
}: {
  submission: Submission;
  isGroupAssignment: boolean;
  isGraded: boolean;
}) {
  return (
    <div className='mt-3 border-l-2 border-primary/50 bg-primary/[0.03] rounded-r-md px-3 py-2 space-y-1.5'>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <p className='text-xs font-medium'>
          {isGroupAssignment ? 'Group submission' : 'Your submission'}
        </p>
        <p className='text-[11px] text-muted-foreground tabular-nums'>
          {format(new Date(submission.submitted_at), 'MMM d, h:mm a')}
          {submission.is_late ? (
            <span className='text-warning ml-1'>· late</span>
          ) : null}
        </p>
      </div>
      {submission.content_url ? (
        <a
          href={submission.content_url}
          target='_blank'
          rel='noreferrer'
          className='inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-full'
        >
          <LinkIcon className='w-3 h-3 shrink-0' />
          <span className='truncate'>{submission.content_url}</span>
        </a>
      ) : null}
      {isGraded && submission.feedback ? (
        <div className='mt-2 pt-2 border-t border-primary/20'>
          <p className='text-[11px] font-medium text-muted-foreground mb-0.5'>
            Teacher feedback
          </p>
          <p className='select-text text-xs whitespace-pre-wrap'>{submission.feedback}</p>
        </div>
      ) : null}
    </div>
  );
}
