'use client';

import { format } from 'date-fns';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { PdfViewer } from '../_shared/pdf-viewer-lazy';
import { isPdfUrl } from '../_shared/is-pdf-url';
import { parseSubmissionContent, formatLateBy } from './student-assignment-card/helpers';
import type { Submission } from '@/lib/course-details/services/assignments-types';
import { GradingDrawerSection } from './grading-drawer-section';
import { gradingBlue } from './grading-drawer-blue';
import { cn } from '@/lib/utils';

export function GradingDrawerSubmission({
  submission,
  dueAt
}: {
  submission: Submission;
  dueAt?: Date | string | null;
}) {
  const content = submission.content_url
    ? parseSubmissionContent(submission.content_url)
    : null;
  const lateBy =
    submission.is_late && dueAt
      ? formatLateBy(submission.submitted_at, dueAt)
      : null;

  return (
    <GradingDrawerSection title='Submitted work' hint='Open or download what the student sent.'>
      {!content && !submission.content_url ? (
        <p className='rounded-lg border border-dashed border-border bg-muted/40 px-3 py-4 text-center text-sm text-muted-foreground'>
          This student has not uploaded anything yet.
        </p>
      ) : (
        <div className='space-y-3'>
          {content ? (
            <div className='flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3'>
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  gradingBlue.iconBox
                )}
              >
                <FileText className='size-5' aria-hidden />
              </span>
              <div className='min-w-0 flex-1'>
                <a
                  href={content.href}
                  target='_blank'
                  rel='noreferrer'
                  className={cn(
                    'truncate text-sm font-medium text-foreground',
                    gradingBlue.linkHover
                  )}
                >
                  {content.label}
                </a>
                <p className='text-xs text-muted-foreground'>
                  {submission.submitted_at
                    ? `Submitted ${format(new Date(submission.submitted_at), 'MMM d, h:mm a')}`
                    : content.type === 'link'
                      ? content.subtitle
                      : content.kind}
                  {submission.is_late ? (
                    <span className='ml-1 font-medium text-warning-foreground'>
                      · {lateBy ?? 'Late'}
                    </span>
                  ) : null}
                </p>
              </div>
              <a
                href={content.href}
                target='_blank'
                rel='noreferrer'
                download={content.type === 'file' ? content.label : undefined}
                className={cn(
                  'inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-opacity',
                  gradingBlue.downloadBtn
                )}
                aria-label='Open submission'
              >
                {content.type === 'file' ? (
                  <Download className='size-4' />
                ) : (
                  <ExternalLink className='size-4' />
                )}
              </a>
            </div>
          ) : null}

          {submission.content_url && isPdfUrl(submission.content_url) ? (
            <div className='overflow-hidden rounded-lg border border-border'>
              <PdfViewer url={submission.content_url} />
            </div>
          ) : null}
        </div>
      )}
    </GradingDrawerSection>
  );
}
