'use client';

import { useMemo } from 'react';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { downloadGradeCsv as exportGradeCsv } from './download-grade-csv';
import { SubmissionsTable } from './submissions-table';
import { SubmissionsModals } from './submissions-modals';
import {
  MultiTabGradingBanner,
  SubmissionsToolbar
} from './submissions-toolbar';
import { useGradeActions } from './use-grade-actions';
import { useBulkActions } from './use-bulk-actions';
import { useSubmissionsViewState } from './use-submissions-view-state';
import { useSubmissionsData } from './use-submissions-data';
import { getBulkSelectionCounts } from './use-submission-rows';

interface SubmissionsViewProps {
  courseId: string;
  assignment: Assignment;
  onBack: () => void;
}

/** Teacher grading workspace. Mount with key={assignment.id}. */
export function SubmissionsView({ courseId, assignment, onBack }: SubmissionsViewProps) {
  const s = useSubmissionsViewState(assignment, courseId);
  const d = useSubmissionsData(
    courseId, assignment, s.filter, s.subSearch, s.subSort, s.selectedSubmission?.id ?? null
  );
  const gradeActions = useGradeActions({
    assignment,
    submissions: d.submissions,
    allGroupRows: d.allGroupRows,
    selectedSubmission: s.selectedSubmission,
    setSelectedSubmission: s.setSelectedSubmission,
    setDrawerOpen: s.setDrawerOpen,
    setOutcome: s.setOutcome,
    grade: s.grade,
    setGrade: s.setGrade,
    feedback: s.feedback,
    setFeedback: s.setFeedback,
    setExtensionDate: s.setExtensionDate,
    setExtensionReason: s.setExtensionReason,
    memberGrades: s.memberGrades,
    setMemberGrades: s.setMemberGrades,
    memberFeedbacks: s.memberFeedbacks,
    setMemberFeedbacks: s.setMemberFeedbacks,
    extensionDate: s.extensionDate,
    extensionReason: s.extensionReason,
    gradeMutation: d.gradeMutation,
    extensionMutation: d.extensionMutation,
    extensionBatchMutation: d.extensionBatchMutation
  });
  const bulkActions = useBulkActions({
    assignment,
    isGroupMode: d.isGroupMode,
    allGroupRows: d.allGroupRows,
    submissionsByStudent: d.submissionsByStudent,
    selectedRows: s.selectedRows,
    setSelectedRows: s.setSelectedRows,
    bulkGradeValue: s.bulkGradeValue,
    setBulkGradeValue: s.setBulkGradeValue,
    bulkGradeFeedback: s.bulkGradeFeedback,
    setBulkGradeFeedback: s.setBulkGradeFeedback,
    setBulkGradeOpen: s.setBulkGradeOpen,
    setBulkGradeRunning: s.setBulkGradeRunning,
    bulkDate: s.bulkDate,
    setBulkDate: s.setBulkDate,
    bulkReason: s.bulkReason,
    setBulkReason: s.setBulkReason,
    setBulkOpen: s.setBulkOpen,
    gradeMutation: d.gradeMutation,
    extensionBatchMutation: d.extensionBatchMutation
  });
  const bulkSelection = useMemo(
    () =>
      getBulkSelectionCounts({
        isGroupMode: d.isGroupMode,
        selectedRows: s.selectedRows,
        submissionsByStudent: d.submissionsByStudent,
        allGroupRows: d.allGroupRows
      }),
    [d.isGroupMode, d.submissionsByStudent, d.allGroupRows, s.selectedRows]
  );
  return (
    <div className='space-y-5'>
      <SubmissionsToolbar
        title={assignment.title}
        attachments={assignment.attachments}
        gradeCount={bulkSelection.gradeCount}
        extendCount={bulkSelection.extendCount}
        onBack={onBack}
        onBulkGrade={() => s.setBulkGradeOpen(true)}
        onBulkExtend={() => s.setBulkOpen(true)}
        onDeleteAttachment={(att) =>
          s.setAttachmentToDelete({
            assignmentId: assignment.id,
            attachmentId: att.id,
            name: att.name
          })
        }
      />
      {d.multiTabGradingConflict ? <MultiTabGradingBanner /> : null}
      <SubmissionsTable
        isGroupMode={d.isGroupMode}
        loading={d.subsLoading}
        search={s.subSearch}
        onSearchChange={s.setSubSearch}
        filter={s.filter}
        onFilterChange={s.setFilter}
        allStudentRows={d.allStudentRows}
        allGroupRows={d.allGroupRows}
        subSort={s.subSort}
        onSortChange={s.setSubSort}
        selectedRows={s.selectedRows}
        onToggleRow={(id, checked) =>
          s.setSelectedRows((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
          })
        }
        onGrade={gradeActions.openGrading}
        onExtendMissing={(targetId) => {
          s.setSelectedRows(new Set([targetId]));
          s.setBulkDate('');
          s.setBulkReason('');
          s.setBulkOpen(true);
        }}
        filteredGroupSubs={d.filteredGroupSubs}
        filteredSubs={d.filteredSubs}
        groupsEmpty={d.groups.length === 0}
        rosterEmpty={d.roster.length === 0}
        assignment={assignment}
        extensions={d.extensions}
        onExport={() =>
          exportGradeCsv({
            assignment,
            rows: d.allStudentRows,
            extensions: d.extensions
          })
        }
      />
      <SubmissionsModals
        courseId={courseId}
        assignment={assignment}
        s={s}
        d={d}
        gradeActions={gradeActions}
        bulkActions={bulkActions}
        bulkSelection={bulkSelection}
      />
    </div>
  );
}
