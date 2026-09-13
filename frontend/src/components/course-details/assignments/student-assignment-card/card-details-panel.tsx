'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupInfo } from '@/lib/course-details/services/groups-types';
import type { AssignmentCardTiming } from './assignment-card-state';
import { AssignmentAttachments } from './attachments-list';
import { GroupInfoPanel } from './group-info-panel';
import { SubmissionSummary } from './submission-summary';
import { SubmitForm } from './submit-form';

type SubmitProps = {
  submitMode: 'link' | 'file';
  onSubmitModeChange: (mode: 'link' | 'file') => void;
  submitUrl: string;
  onSubmitUrlChange: (v: string) => void;
  pendingFile: File | null;
  onPendingFileChange: (f: File | null) => void;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export function CardDetailsPanel({
  assignment: a,
  timing,
  mySubmission,
  groupInfo,
  submitProps,
}: {
  assignment: Assignment;
  timing: AssignmentCardTiming;
  mySubmission: Submission | null;
  groupInfo: GroupInfo | null | undefined;
  submitProps: SubmitProps;
}) {
  const hasSubmitted = mySubmission != null || timing.hasSubmitted;

  return (
    <div className='space-y-4' onClick={(e) => e.stopPropagation()}>
      <div className='flex items-center justify-between gap-3'>
        <Badge
          size='sm'
          className={
            a.workMode === 'GROUP'
              ? 'shrink-0 rounded-full border-transparent bg-warning text-white'
              : 'shrink-0 rounded-full border-transparent bg-info text-info-foreground'
          }
        >
          {a.workMode === 'GROUP' ? 'Group' : 'Individual'}
        </Badge>
      </div>

      {a.attachments && a.attachments.length > 0 ? (
        <AssignmentAttachments attachments={a.attachments} />
      ) : null}

      {timing.isGroupAssignment ? (
        <GroupInfoPanel groupInfo={groupInfo ?? null} isLeader={timing.isLeader} />
      ) : null}

      {hasSubmitted && mySubmission ? (
        <SubmissionSummary
          submission={mySubmission}
          isGroupAssignment={timing.isGroupAssignment}
          isGraded={timing.isGraded}
          maxMarks={a.maxMarks ?? 100}
          dueAt={timing.due}
        />
      ) : null}

      {timing.canSubmit ? (
        <SubmitForm hasSubmitted={hasSubmitted} {...submitProps} />
      ) : timing.isGraded ? (
        <p className='text-sm text-muted-foreground'>
          Graded — resubmissions are closed.
        </p>
      ) : timing.notOpenYet ? (
        <p className='text-sm text-muted-foreground'>
          Opens {timing.openAt ? format(timing.openAt, 'MMM d, h:mm a') : 'soon'}
        </p>
      ) : timing.closed && !hasSubmitted ? (
        <p className='text-sm text-destructive'>Submissions closed</p>
      ) : null}
    </div>
  );
}
