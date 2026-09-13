'use client';

import { Download, ExternalLink, FileText, MessageSquareText } from 'lucide-react';
import { format } from 'date-fns';
import type { Submission } from '@/lib/course-details/services/assignments-types';
import { formatLateBy, parseSubmissionContent } from './helpers';

export function SubmissionSummary({
  submission,
  isGroupAssignment,
  isGraded,
  maxMarks,
  dueAt,
}: {
  submission: Submission;
  isGroupAssignment: boolean;
  isGraded: boolean;
  maxMarks: number;
  dueAt?: Date | string | null;
}) {
  const content = submission.content_url
    ? parseSubmissionContent(submission.content_url)
    : null;
  const teacherFeedback = submission.feedback?.trim() ?? '';
  const showFeedback = submission.is_reviewed && teacherFeedback.length > 0;
  const lateBy =
    submission.is_late && dueAt
      ? formatLateBy(submission.submitted_at, dueAt)
      : null;

  return (
    <div className='space-y-2'>
      <p className='text-sm text-success'>
        {isGroupAssignment ? 'Group work sent' : 'You sent this'}
        <span className='ml-2 text-foreground'>
          {format(new Date(submission.submitted_at), 'MMM d, h:mm a')}
        </span>
        {submission.is_late ? (
          <span className='ml-2 text-warning'>
            {lateBy ?? 'Late'}
          </span>
        ) : null}
      </p>

      {content ? (
        <div className='flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-2.5'>
          {content.type === 'file' ? (
            <FileText className='size-4 shrink-0 text-primary' aria-hidden />
          ) : (
            <ExternalLink className='size-4 shrink-0 text-primary' aria-hidden />
          )}
          <div className='min-w-0 flex-1'>
            <a
              href={content.href}
              target='_blank'
              rel='noreferrer'
              className='block truncate text-sm font-medium text-foreground hover:text-primary'
            >
              {content.label}
            </a>
            <p className='truncate text-xs text-muted-foreground'>
              {content.type === 'link' ? content.subtitle : content.kind}
            </p>
          </div>
          <a
            href={content.href}
            target='_blank'
            rel='noreferrer'
            download={content.type === 'file' ? content.label : undefined}
            className='inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90'
            title={content.type === 'file' ? 'Download file' : 'Open link'}
            aria-label={content.type === 'file' ? `Download ${content.label}` : 'Open submission link'}
          >
            {content.type === 'file' ? (
              <Download className='size-4' aria-hidden />
            ) : (
              <ExternalLink className='size-4' aria-hidden />
            )}
          </a>
        </div>
      ) : null}

      {showFeedback ? (
        <div className='rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5'>
          <p className='mb-1 flex items-center gap-1.5 text-xs font-medium text-primary'>
            <MessageSquareText className='size-3.5 shrink-0' aria-hidden />
            Teacher feedback
            {isGraded && submission.grade != null ? (
              <span className='font-semibold text-foreground'>
                · {submission.grade}/{maxMarks}
              </span>
            ) : null}
          </p>
          <p className='select-text whitespace-pre-wrap text-sm text-foreground'>
            {teacherFeedback}
          </p>
        </div>
      ) : null}
    </div>
  );
}
