'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { useAssignments, useSubmitWork, useUploadSubmissionFile } from '@/lib/course-details/queries/assignments-queries';

import type { Assignment } from '@/lib/course-details/services/assignments-types';
import {
  resolveAssignmentCardTiming,
  shouldAutoExpandAssignment,
  getAssignmentDisplayStatus,
} from './student-assignment-card/assignment-card-state';
import { CourseTabHeader } from '../_shared/course-tab-header';
import { CourseTabPage } from '../_shared/course-tab-page';
import { StudentAssignmentCard } from './student-assignment-card';
import { AssignmentsLoadingState, AssignmentsEmptyState } from './shared';

function pickAutoExpandId(assignments: Assignment[]): number | null {
  for (const a of assignments) {
    const listSub = a.submissions?.[0];
    const timing = resolveAssignmentCardTiming(a, null, null, a._extension ?? null);
    const status = getAssignmentDisplayStatus(timing, {
      grade: listSub?.grade ?? null,
      maxMarks: a.maxMarks ?? 100,
    });
    if (shouldAutoExpandAssignment(status, timing)) return a.id;
  }
  return null;
}

export function StudentAssignmentsView({ courseId }: { courseId: string }) {
  const { data: assignments = [], isLoading } = useAssignments(courseId, { live: true });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const didAutoExpand = useRef(false);

  const [submitModes, setSubmitModes] = useState<Record<number, 'link' | 'file'>>({});
  const [submitUrls, setSubmitUrls] = useState<Record<number, string>>({});
  const [pendingSubmissionFiles, setPendingSubmissionFiles] = useState<
    Record<number, File | null>
  >({});
  const submissionFileInputRef = useRef<HTMLInputElement | null>(null);
  const [submittingFor, setSubmittingFor] = useState<number | null>(null);

  const publishedAssignments = assignments.filter((a) => !a.is_draft);

  useEffect(() => {
    if (didAutoExpand.current || publishedAssignments.length === 0) return;
    const id = pickAutoExpandId(publishedAssignments);
    if (id != null) {
      setExpandedId(id);
      didAutoExpand.current = true;
    }
  }, [publishedAssignments]);

  const submitModeFor = (assignmentId: number) => submitModes[assignmentId] ?? 'link';
  const submitUrlFor = (assignmentId: number) => submitUrls[assignmentId] ?? '';
  const pendingSubmissionFileFor = (assignmentId: number) =>
    pendingSubmissionFiles[assignmentId] ?? null;

  const submitMutation = useSubmitWork();
  const uploadSubmissionFileMutation = useUploadSubmissionFile();

  const handleStudentSubmit = async (a: Assignment) => {
    const submitMode = submitModeFor(a.id);
    const submitUrl = submitUrlFor(a.id);
    const pendingSubmissionFile = pendingSubmissionFileFor(a.id);

    if (submitMode === 'link' && !submitUrl.trim()) {
      toast.error('Paste a link to your work first');
      return;
    }
    if (submitMode === 'file' && !pendingSubmissionFile) {
      toast.error('Pick a file to upload first');
      return;
    }
    setSubmittingFor(a.id);
    try {
      let urlToSubmit = submitUrl.trim();
      if (submitMode === 'file' && pendingSubmissionFile) {
        const uploaded = await uploadSubmissionFileMutation.mutateAsync({
          assignmentId: a.id,
          file: pendingSubmissionFile,
        });
        urlToSubmit = uploaded.url;
      }
      await submitMutation.mutateAsync({
        assignmentId: a.id,
        input: { link: urlToSubmit },
      });
      toast.success('Submitted');
      setSubmitUrls((prev) => ({ ...prev, [a.id]: '' }));
      setPendingSubmissionFiles((prev) => ({ ...prev, [a.id]: null }));
      if (submissionFileInputRef.current) submissionFileInputRef.current.value = '';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmittingFor(null);
    }
  };

  return (
    <CourseTabPage>
      <CourseTabHeader
        title='Assignments'
        description='View and submit your course assignments.'
      />
      {isLoading ? <AssignmentsLoadingState isStudent /> : null}
      {!isLoading && publishedAssignments.length === 0 && (
        <AssignmentsEmptyState isStudent hasItems={assignments.length > 0} />
      )}
      {!isLoading && publishedAssignments.length > 0 ? (
        <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-2'>
          {publishedAssignments.map((a) => (
            <StudentAssignmentCard
              key={a.id}
              assignment={a}
              expanded={expandedId === a.id}
              onExpandedChange={(open) => setExpandedId(open ? a.id : null)}
              submitMode={submitModeFor(a.id)}
              onSubmitModeChange={(mode) =>
                setSubmitModes((prev) => ({ ...prev, [a.id]: mode }))
              }
              submitUrl={submitUrlFor(a.id)}
              onSubmitUrlChange={(value) =>
                setSubmitUrls((prev) => ({ ...prev, [a.id]: value }))
              }
              pendingFile={pendingSubmissionFileFor(a.id)}
              onPendingFileChange={(file) =>
                setPendingSubmissionFiles((prev) => ({ ...prev, [a.id]: file }))
              }
              fileInputRef={submissionFileInputRef}
              isSubmitting={submittingFor === a.id}
              onSubmit={() => handleStudentSubmit(a)}
            />
          ))}
        </div>
      ) : null}
    </CourseTabPage>
  );
}
