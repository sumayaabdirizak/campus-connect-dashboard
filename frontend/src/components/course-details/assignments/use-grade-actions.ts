'use client';

import { toast } from 'sonner';
import type { Assignment, Submission } from '@/lib/course-details/services/assignments-types';
import type { GroupRow, Outcome } from './shared';
import { MANUAL_GRADE_CONTENT_URL, VIRTUAL_MANUAL_GRADE_ID } from './shared';
import {
  grantAnotherChance,
  saveIndividualMemberGrades,
  type GradeMutateLike
} from './grade-action-helpers';

export function useGradeActions(a: {
  assignment: Assignment;
  submissions: Submission[];
  allGroupRows: GroupRow[];
  selectedSubmission: Submission | null;
  setSelectedSubmission: (s: Submission | null) => void;
  setDrawerOpen: (v: boolean) => void;
  setOutcome: (o: Outcome) => void;
  grade: string;
  setGrade: (v: string) => void;
  feedback: string;
  setFeedback: (v: string) => void;
  setExtensionDate: (v: string) => void;
  setExtensionReason: (v: string) => void;
  memberGrades: Map<number, string>;
  setMemberGrades: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  memberFeedbacks: Map<number, string>;
  setMemberFeedbacks: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  extensionDate: string;
  extensionReason: string;
  gradeMutation: GradeMutateLike;
  manualGradeMutation: GradeMutateLike;
  extensionMutation: GradeMutateLike;
  extensionBatchMutation: GradeMutateLike;
}) {
  const selectedAssignment = a.assignment;
  const openManualGrade = (student: { id: number; full_name: string; number: string; email?: string }) => {
    const virtual: Submission = {
      id: VIRTUAL_MANUAL_GRADE_ID,
      assignmentId: selectedAssignment.id,
      studentId: student.id,
      groupId: null,
      content_url: MANUAL_GRADE_CONTENT_URL,
      submitted_at: new Date().toISOString(),
      grade: null,
      feedback: null,
      is_reviewed: false,
      is_late: false,
      student: {
        id: student.id,
        full_name: student.full_name,
        email: student.email ?? '',
        number: student.number
      }
    };
    a.setSelectedSubmission(virtual);
    a.setOutcome('grade');
    a.setGrade('');
    a.setFeedback('');
    a.setExtensionDate('');
    a.setExtensionReason('');
    a.setMemberGrades(new Map());
    a.setMemberFeedbacks(new Map());
    a.setDrawerOpen(true);
  };
  const openGrading = (sub: Submission) => {
    a.setSelectedSubmission(sub);
    a.setOutcome('grade');
    a.setGrade(sub.grade != null ? String(sub.grade) : '');
    a.setFeedback(sub.feedback ?? '');
    a.setExtensionDate('');
    a.setExtensionReason('');
    if (
      selectedAssignment.workMode === 'GROUP' &&
      selectedAssignment.gradingScope === 'INDIVIDUAL' &&
      sub.groupId != null
    ) {
      const groupSubs = a.submissions.filter((s) => s.groupId === sub.groupId);
      const grades = new Map<number, string>();
      const feedbacks = new Map<number, string>();
      for (const s of groupSubs) {
        grades.set(s.studentId, s.grade != null ? String(s.grade) : '');
        feedbacks.set(s.studentId, s.feedback ?? '');
      }
      a.setMemberGrades(grades);
      a.setMemberFeedbacks(feedbacks);
    } else {
      a.setMemberGrades(new Map());
      a.setMemberFeedbacks(new Map());
    }
    a.setDrawerOpen(true);
  };
  const handleSaveGrade = (next?: Submission | null) => {
    if (!a.selectedSubmission) return;
    if (a.grade !== '') {
      const g = Number(a.grade);
      const cap = selectedAssignment.maxMarks ?? 100;
      if (Number.isNaN(g) || g < 0 || g > cap) {
        toast.error(`Grade must be between 0 and ${cap}`);
        return;
      }
    }

    if (a.selectedSubmission.id === VIRTUAL_MANUAL_GRADE_ID) {
      if (a.grade === '') {
        toast.error('Enter a mark first');
        return;
      }
      a.manualGradeMutation.mutate(
        {
          assignmentId: selectedAssignment.id,
          input: {
            studentId: a.selectedSubmission.studentId,
            grade: Number(a.grade),
            feedback: a.feedback || undefined
          }
        },
        {
          onSuccess: () => {
            toast.success('Mark recorded');
            if (next) openGrading(next);
            else a.setDrawerOpen(false);
          },
          onError: (e: Error) => toast.error(e.message)
        }
      );
      return;
    }

    a.gradeMutation.mutate(
      {
        assignmentId: selectedAssignment.id,
        input: {
          submissionId: a.selectedSubmission.id,
          grade: a.grade === '' ? undefined : Number(a.grade),
          feedback: a.feedback || undefined,
          is_reviewed: true
        }
      },
      {
        onSuccess: () => {
          toast.success(
            selectedAssignment.gradingScope === 'GROUP'
              ? 'Grade saved — applied to all group members'
              : 'Grade saved'
          );
          if (next) openGrading(next);
          else a.setDrawerOpen(false);
        },
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };
  const handleSaveIndividualGrades = () => {
    if (!a.selectedSubmission) return;
    return saveIndividualMemberGrades({
      assignment: selectedAssignment,
      submissions: a.submissions,
      allGroupRows: a.allGroupRows,
      selectedSubmission: a.selectedSubmission,
      memberGrades: a.memberGrades,
      memberFeedbacks: a.memberFeedbacks,
      gradeMutation: a.gradeMutation,
      setDrawerOpen: a.setDrawerOpen
    });
  };
  const handleGiveAnotherChance = () => {
    if (!a.selectedSubmission) return;
    grantAnotherChance({
      assignment: selectedAssignment,
      selectedSubmission: a.selectedSubmission,
      extensionDate: a.extensionDate,
      extensionReason: a.extensionReason,
      extensionMutation: a.extensionMutation,
      extensionBatchMutation: a.extensionBatchMutation,
      setDrawerOpen: a.setDrawerOpen
    });
  };
  return {
    openGrading,
    openManualGrade,
    handleSaveGrade,
    handleSaveIndividualGrades,
    handleGiveAnotherChance
  };
}
