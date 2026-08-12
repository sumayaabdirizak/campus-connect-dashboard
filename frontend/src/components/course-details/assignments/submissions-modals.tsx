'use client';

import { toast } from 'sonner';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import type { useSubmissionsViewState } from './use-submissions-view-state';
import type { useSubmissionsData } from './use-submissions-data';
import type { useGradeActions } from './use-grade-actions';
import type { useBulkActions } from './use-bulk-actions';
import { GradingDrawer } from './grading-drawer';
import {
  BulkExtendDialog,
  BulkGradeDialog,
  DeleteAttachmentDialog
} from './submissions-bulk-dialogs';

type S = ReturnType<typeof useSubmissionsViewState>;
type D = ReturnType<typeof useSubmissionsData>;
type G = ReturnType<typeof useGradeActions>;
type B = ReturnType<typeof useBulkActions>;

export function SubmissionsModals({
  courseId,
  assignment,
  s,
  d,
  gradeActions,
  bulkActions
}: {
  courseId: string;
  assignment: Assignment;
  s: S;
  d: D;
  gradeActions: G;
  bulkActions: B;
}) {
  return (
    <>
      <GradingDrawer
        open={s.drawerOpen}
        onOpenChange={s.setDrawerOpen}
        courseId={courseId}
        assignment={assignment}
        submission={s.selectedSubmission}
        allGroupRows={d.allGroupRows}
        submissions={d.submissions}
        outcome={s.outcome}
        setOutcome={s.setOutcome}
        grade={s.grade}
        setGrade={s.setGrade}
        feedback={s.feedback}
        setFeedback={s.setFeedback}
        extensionDate={s.extensionDate}
        setExtensionDate={s.setExtensionDate}
        extensionReason={s.extensionReason}
        setExtensionReason={s.setExtensionReason}
        memberGrades={s.memberGrades}
        setMemberGrades={s.setMemberGrades}
        memberFeedbacks={s.memberFeedbacks}
        setMemberFeedbacks={s.setMemberFeedbacks}
        nextSubmission={d.nextSubmission}
        gradePending={d.gradeMutation.isPending}
        extensionPending={
          d.extensionMutation.isPending || d.extensionBatchMutation.isPending
        }
        onSaveGrade={gradeActions.handleSaveGrade}
        onSaveIndividual={gradeActions.handleSaveIndividualGrades}
        onExtend={gradeActions.handleGiveAnotherChance}
        onMarkMissing={gradeActions.handleMarkMissing}
        templates={s.templatesApi.templates}
        templatesMenuOpen={s.templatesApi.templatesMenuOpen}
        setTemplatesMenuOpen={s.templatesApi.setTemplatesMenuOpen}
        newTemplate={s.templatesApi.newTemplate}
        setNewTemplate={s.templatesApi.setNewTemplate}
        persistTemplates={s.templatesApi.persistTemplates}
        insertTemplate={s.insertTemplate}
      />
      <BulkGradeDialog
        open={s.bulkGradeOpen}
        onOpenChange={s.setBulkGradeOpen}
        selectedCount={s.selectedRows.size}
        maxMarks={assignment.maxMarks ?? 100}
        gradeValue={s.bulkGradeValue}
        setGradeValue={s.setBulkGradeValue}
        feedback={s.bulkGradeFeedback}
        setFeedback={s.setBulkGradeFeedback}
        running={s.bulkGradeRunning}
        onApply={bulkActions.handleBulkGrade}
      />
      <BulkExtendDialog
        open={s.bulkOpen}
        onOpenChange={s.setBulkOpen}
        selectedCount={s.selectedRows.size}
        date={s.bulkDate}
        setDate={s.setBulkDate}
        reason={s.bulkReason}
        setReason={s.setBulkReason}
        pending={d.extensionBatchMutation.isPending}
        onGrant={bulkActions.handleBulkExtend}
      />
      <DeleteAttachmentDialog
        target={s.attachmentToDelete}
        onClose={() => s.setAttachmentToDelete(null)}
        onConfirm={() => {
          if (!s.attachmentToDelete) return;
          d.deleteAttachmentMutation.mutate(
            {
              assignmentId: s.attachmentToDelete.assignmentId,
              attachmentId: s.attachmentToDelete.attachmentId
            },
            {
              onSuccess: () => toast.success(`Removed ${s.attachmentToDelete!.name}`),
              onError: (e: Error) => toast.error(e.message)
            }
          );
          s.setAttachmentToDelete(null);
        }}
      />
    </>
  );
}
