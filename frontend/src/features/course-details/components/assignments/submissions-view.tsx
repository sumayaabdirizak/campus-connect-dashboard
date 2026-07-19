'use client';

import { ListSkeleton } from '../_shared/list-skeleton';
import type { Assignment } from '../../api/assignments-types';
import { downloadGradeCsv as exportGradeCsv } from './download-grade-csv';
import { AssignmentSummaryCard } from './assignment-summary-card';
import { SubmissionsFilters } from './submissions-filters';
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
  return (
    <div className='space-y-5'>
      <SubmissionsToolbar
        selectedCount={s.selectedRows.size}
        onBack={onBack}
        onBulkGrade={() => s.setBulkGradeOpen(true)}
        onBulkExtend={() => s.setBulkOpen(true)}
        onExport={() =>
          exportGradeCsv({
            assignment,
            rows: d.allStudentRows,
            extensions: d.extensions
          })
        }
      />
      {d.multiTabGradingConflict ? <MultiTabGradingBanner /> : null}
      <AssignmentSummaryCard
        assignment={assignment}
        onDeleteAttachment={(att) =>
          s.setAttachmentToDelete({
            assignmentId: assignment.id,
            attachmentId: att.id,
            name: att.name
          })
        }
      />
      <SubmissionsFilters
        filter={s.filter}
        setFilter={s.setFilter}
        search={s.subSearch}
        setSearch={s.setSubSearch}
        isGroupMode={d.isGroupMode}
        allGroupRows={d.allGroupRows}
        allStudentRows={d.allStudentRows}
        assignment={assignment}
        extensions={d.extensions}
      />
      {d.subsLoading ? <ListSkeleton variant='row' count={4} /> : null}
      <SubmissionsTable
        isGroupMode={d.isGroupMode}
        loading={d.subsLoading}
        filter={s.filter}
        search={s.subSearch}
        subSort={s.subSort}
        onSort={(sortKey) =>
          s.setSubSort((prev) =>
            prev.key === sortKey
              ? { key: sortKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
              : { key: sortKey, dir: 'asc' }
          )
        }
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
        filteredGroupSubs={d.filteredGroupSubs}
        filteredSubs={d.filteredSubs}
        groupsEmpty={d.groups.length === 0}
        rosterEmpty={d.roster.length === 0}
        assignment={assignment}
        extensions={d.extensions}
      />
      <SubmissionsModals
        courseId={courseId}
        assignment={assignment}
        s={s}
        d={d}
        gradeActions={gradeActions}
        bulkActions={bulkActions}
      />
    </div>
  );
}
