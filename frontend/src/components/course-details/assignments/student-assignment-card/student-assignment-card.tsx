'use client';

import { format } from 'date-fns';
import { useMySubmission } from '@/lib/course-details/queries/assignments-queries';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import {
  getAssignmentDisplayStatus,
  resolveAssignmentCardTiming,
} from './assignment-card-state';
import { CardDetailsPanel } from './card-details-panel';
import { CardSummaryRow } from './card-summary-row';

export function StudentAssignmentCard({
  assignment: a,
  expanded,
  onExpandedChange,
  submitMode,
  onSubmitModeChange,
  submitUrl,
  onSubmitUrlChange,
  pendingFile,
  onPendingFileChange,
  fileInputRef,
  isSubmitting,
  onSubmit,
}: {
  assignment: Assignment;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  submitMode: 'link' | 'file';
  onSubmitModeChange: (mode: 'link' | 'file') => void;
  submitUrl: string;
  onSubmitUrlChange: (v: string) => void;
  pendingFile: File | null;
  onPendingFileChange: (f: File | null) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const listSub = a.submissions?.[0];
  const { data: rawMySubmission } = useMySubmission(expanded ? a.id : null, { live: true });

  const extension =
    rawMySubmission?._extension ?? a._extension ?? null;
  const mySubmission =
    rawMySubmission && !('_noSubmission' in rawMySubmission) ? rawMySubmission : null;
  const groupInfo = rawMySubmission?._groupInfo ?? null;

  const timing = resolveAssignmentCardTiming(a, mySubmission, groupInfo, extension);
  const grade = mySubmission?.grade ?? listSub?.grade ?? null;
  const isLate = mySubmission?.is_late ?? false;
  const status = getAssignmentDisplayStatus(timing, {
    grade,
    isLate,
    maxMarks: a.maxMarks ?? 100,
  });

  return (
    <article className='min-w-0 rounded-xl border bg-card p-5 text-foreground'>
      <CardSummaryRow
        title={a.title}
        description={a.description}
        dueShort={format(timing.due, 'MMM d')}
        dueLine={
          timing.hasExtension
            ? `Extended to ${format(timing.due, 'MMM d, h:mm a')}`
            : `Due ${format(timing.due, 'MMM d, h:mm a')}`
        }
        maxMarks={a.maxMarks ?? 100}
        attachmentCount={a.attachments?.length ?? 0}
        status={status}
        expanded={expanded}
        onToggle={() => onExpandedChange(!expanded)}
      />

      {expanded ? (
        <div
          id={`assignment-details-${a.id}`}
          className='mt-4 border-t border-border/70 pt-4'
        >
          <CardDetailsPanel
            assignment={a}
            timing={timing}
            mySubmission={mySubmission}
            groupInfo={groupInfo}
            submitProps={{
              submitMode,
              onSubmitModeChange,
              submitUrl,
              onSubmitUrlChange,
              pendingFile,
              onPendingFileChange,
              fileInputRef,
              isSubmitting,
              onSubmit,
            }}
          />
        </div>
      ) : null}
    </article>
  );
}
