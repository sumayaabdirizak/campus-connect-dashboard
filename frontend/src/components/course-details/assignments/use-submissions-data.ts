'use client';

import {
  useDeleteAttachment,
  useExtensions,
  useGradeSubmission,
  useGrantExtension,
  useGrantExtensionBatch,
  useSubmissions
} from '@/lib/course-details/queries/assignments-queries';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import { useGroups } from '@/lib/course-details/queries/groups-queries';
import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { useMultiTabGradingGuard } from './use-multi-tab-grading';
import {
  filterAndSortGroupRows,
  filterAndSortStudentRows,
  useSubmissionRowMaps,
  type SubmissionFilter,
  type SubmissionSortKey
} from './use-submission-rows';

export function useSubmissionsData(
  courseId: string,
  assignment: Assignment,
  filter: SubmissionFilter,
  search: string,
  sort: { key: SubmissionSortKey; dir: 'asc' | 'desc' },
  selectedSubmissionId: number | null
) {
  const { data: groups = [] } = useGroups(courseId, { live: true });
  const deleteAttachmentMutation = useDeleteAttachment(courseId);
  const multiTabGradingConflict = useMultiTabGradingGuard(assignment.id);
  const gradeMutation = useGradeSubmission();
  const extensionMutation = useGrantExtension();
  const extensionBatchMutation = useGrantExtensionBatch();
  const { data: submissions = [], isLoading: subsLoading } = useSubmissions(
    assignment.id,
    { live: true }
  );
  const { data: extensions = [] } = useExtensions(assignment.id, { live: true });
  const { data: roster = [] } = useRoster(courseId, { live: true });
  const { submissionsByStudent, allStudentRows, allGroupRows } = useSubmissionRowMaps({
    submissions,
    roster,
    groups
  });
  const isGroupMode = assignment.workMode === 'GROUP';
  const filteredSubs = filterAndSortStudentRows({
    rows: allStudentRows,
    assignment,
    extensions,
    filter,
    search,
    sort
  });
  const filteredGroupSubs = isGroupMode
    ? filterAndSortGroupRows({
        rows: allGroupRows,
        assignment,
        extensions,
        filter,
        search,
        sort
      })
    : [];
  const gradableRows = isGroupMode
    ? filteredGroupSubs.filter((r) => r.submission !== null)
    : filteredSubs.filter((r) => r.submission !== null);
  const currentSubIdx = selectedSubmissionId
    ? gradableRows.findIndex((r) => r.submission?.id === selectedSubmissionId)
    : -1;
  const nextSubmission =
    currentSubIdx >= 0 && currentSubIdx < gradableRows.length - 1
      ? gradableRows[currentSubIdx + 1].submission!
      : null;

  return {
    groups,
    roster,
    submissions,
    extensions,
    subsLoading,
    submissionsByStudent,
    allStudentRows,
    allGroupRows,
    isGroupMode,
    filteredSubs,
    filteredGroupSubs,
    nextSubmission,
    multiTabGradingConflict,
    deleteAttachmentMutation,
    gradeMutation,
    extensionMutation,
    extensionBatchMutation
  };
}
