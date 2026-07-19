'use client';

import { format } from 'date-fns';
import { useMySubmission } from '../../../api/assignments-queries';
import type { Assignment } from '../../../api/assignments-types';
import { AssignmentAttachments } from './attachments-list';
import { AssignmentCardHeader } from './card-header';
import { GroupInfoPanel } from './group-info-panel';
import { dueSoonLabel, statusAccentClass } from './helpers';
import { SubmissionSummary } from './submission-summary';
import { SubmitForm } from './submit-form';

export function StudentAssignmentCard({
  assignment: a,
  courseOfferingPublicId,
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
  courseOfferingPublicId: string;
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
  const { data: rawMySubmission } = useMySubmission(a.id);

  const mySubmission =
    rawMySubmission && !('_noSubmission' in rawMySubmission) ? rawMySubmission : null;
  const myExtension = rawMySubmission?._extension ?? null;
  const groupInfo = rawMySubmission?._groupInfo ?? null;
  const isGroupAssignment = a.workMode === 'GROUP';
  const isLeader = groupInfo?.isLeader === true;

  const now = new Date();
  const openAt = a.open_at ? new Date(a.open_at) : null;
  const baseDue = new Date(a.due_date);
  const extensionDue = myExtension?.newDueAt ? new Date(myExtension.newDueAt) : null;
  const due = extensionDue && extensionDue > baseDue ? extensionDue : baseDue;
  const hasExtension = extensionDue != null && extensionDue > baseDue;
  const notOpenYet = openAt != null && now < openAt;
  const closed = now > new Date(due.getTime() + (a.lateWindowMinutes ?? 0) * 60_000);

  const hasSubmitted = mySubmission != null;
  const isGraded = mySubmission?.is_reviewed === true && mySubmission?.grade != null;
  const passed = isGraded && (mySubmission?.grade ?? 0) >= 50;

  const msUntilDue = due.getTime() - now.getTime();
  const dueSoon = !closed && msUntilDue > 0 && msUntilDue < 48 * 60 * 60 * 1000;
  const dueSoonText = dueSoonLabel(msUntilDue);
  const statusAccent = statusAccentClass({
    isGraded,
    passed,
    hasSubmitted,
    closed,
    dueSoon,
  });

  const canSubmit = !notOpenYet && !closed && (!isGroupAssignment || isLeader);

  return (
    <div
      className={`rounded-lg border border-l-4 ${statusAccent} p-4 transition-shadow hover:shadow-sm`}
    >
      <AssignmentCardHeader
        assignment={a}
        courseOfferingPublicId={courseOfferingPublicId}
        mySubmission={mySubmission}
        openAt={openAt}
        due={due}
        baseDue={baseDue}
        hasExtension={hasExtension}
        isGraded={isGraded}
        passed={passed}
        hasSubmitted={hasSubmitted}
        closed={closed}
        dueSoon={dueSoon}
        dueSoonText={dueSoonText}
      />

      {a.attachments && a.attachments.length > 0 ? (
        <AssignmentAttachments attachments={a.attachments} />
      ) : null}

      {isGroupAssignment ? (
        <GroupInfoPanel groupInfo={groupInfo} isLeader={isLeader} />
      ) : null}

      {hasSubmitted && mySubmission ? (
        <SubmissionSummary
          submission={mySubmission}
          isGroupAssignment={isGroupAssignment}
          isGraded={isGraded}
        />
      ) : null}

      {canSubmit ? (
        <SubmitForm
          hasSubmitted={hasSubmitted}
          submitMode={submitMode}
          onSubmitModeChange={onSubmitModeChange}
          submitUrl={submitUrl}
          onSubmitUrlChange={onSubmitUrlChange}
          pendingFile={pendingFile}
          onPendingFileChange={onPendingFileChange}
          fileInputRef={fileInputRef}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
        />
      ) : null}

      {notOpenYet || closed ? (
        <div className='mt-3'>
          <p className='text-xs text-muted-foreground'>
            {notOpenYet
              ? `Submissions open ${openAt ? format(openAt, 'MMM d, h:mm a') : 'soon'}.`
              : `Submissions closed${
                  (a.lateWindowMinutes ?? 0) > 0
                    ? ` ${a.lateWindowMinutes} min after the due date`
                    : ''
                }.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
