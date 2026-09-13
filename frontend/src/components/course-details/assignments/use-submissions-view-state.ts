'use client';

import { useState } from 'react';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { Outcome } from './shared';
import { useFeedbackTemplates } from './use-feedback-templates';
import type { SubmissionFilter, SubmissionSortKey } from './use-submission-rows';

export function useSubmissionsViewState(assignment: Assignment, courseId: string) {
  const [filter, setFilter] = useState<SubmissionFilter>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [outcome, setOutcome] = useState<Outcome>('grade');
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [memberGrades, setMemberGrades] = useState<Map<number, string>>(new Map());
  const [memberFeedbacks, setMemberFeedbacks] = useState<Map<number, string>>(new Map());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [attachmentToDelete, setAttachmentToDelete] = useState<{
    assignmentId: number;
    attachmentId: number;
    name: string;
  } | null>(null);
  const [subSort, setSubSort] = useState<{ key: SubmissionSortKey; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc'
  });
  const [subSearch, setSubSearch] = useState('');
  const templatesApi = useFeedbackTemplates(courseId);
  const insertTemplate = (text: string) => {
    setFeedback((prev) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
  };
  const [bulkGradeOpen, setBulkGradeOpen] = useState(false);
  const [bulkGradeValue, setBulkGradeValue] = useState('');
  const [bulkGradeFeedback, setBulkGradeFeedback] = useState('');
  const [bulkGradeRunning, setBulkGradeRunning] = useState(false);

  void assignment; // reserved for future keyed resets if mount key is removed

  return {
    filter,
    setFilter,
    selectedSubmission,
    setSelectedSubmission,
    drawerOpen,
    setDrawerOpen,
    selectedRows,
    setSelectedRows,
    outcome,
    setOutcome,
    grade,
    setGrade,
    feedback,
    setFeedback,
    extensionDate,
    setExtensionDate,
    extensionReason,
    setExtensionReason,
    memberGrades,
    setMemberGrades,
    memberFeedbacks,
    setMemberFeedbacks,
    bulkOpen,
    setBulkOpen,
    bulkDate,
    setBulkDate,
    bulkReason,
    setBulkReason,
    attachmentToDelete,
    setAttachmentToDelete,
    subSort,
    setSubSort,
    subSearch,
    setSubSearch,
    templatesApi,
    insertTemplate,
    bulkGradeOpen,
    setBulkGradeOpen,
    bulkGradeValue,
    setBulkGradeValue,
    bulkGradeFeedback,
    setBulkGradeFeedback,
    bulkGradeRunning,
    setBulkGradeRunning
  };
}
