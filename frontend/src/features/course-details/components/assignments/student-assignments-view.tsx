'use client';

import { useRef, useState } from 'react';

import { CalendarPlus } from 'lucide-react';

import { toast } from 'sonner';

import { courseAssignmentsIcsUrl } from '../../api/assignments-service';
import { useAssignments, useSubmitWork, useUploadSubmissionFile } from '../../api/assignments-queries';

import type { Assignment } from '../../api/assignments-types';
import { StudentAssignmentCard } from './student-assignment-card';
import { StudentSummaryCard } from './student-summary-card';
import { AssignmentsLoadingState, AssignmentsEmptyState } from './shared';
/**
 * Student-facing assignments tab: progress rollup, deadline feed, and the
 * per-assignment submit flow. Owns all student submit state so the teacher
 * grading workspace (course-assignments.tsx) stays student-free.
 */
export function StudentAssignmentsView({ courseId }: { courseId: string }) {
  const { data: assignments = [], isLoading } = useAssignments(courseId);

  // Student-side submission state — kept separate from the teacher's
  // grading state so the same component can render either view cleanly.
  // `submitMode` controls whether the student types a link or uploads a file.
  const [submitModes, setSubmitModes] = useState<Record<number, 'link' | 'file'>>({});
  const [submitUrls, setSubmitUrls] = useState<Record<number, string>>({});
  const [pendingSubmissionFiles, setPendingSubmissionFiles] = useState<Record<number, File | null>>({});
  const submissionFileInputRef = useRef<HTMLInputElement | null>(null);
  // `submittingFor` tracks which assignment the student is currently
  // submitting to so the loading spinner sits on the right card.
  const [submittingFor, setSubmittingFor] = useState<number | null>(null);

  const submitModeFor = (assignmentId: number) => submitModes[assignmentId] ?? 'link';
  const submitUrlFor = (assignmentId: number) => submitUrls[assignmentId] ?? '';
  const pendingSubmissionFileFor = (assignmentId: number) =>
    pendingSubmissionFiles[assignmentId] ?? null;
  const setSubmitModeFor = (assignmentId: number, mode: 'link' | 'file') => {
    setSubmitModes((prev) => ({ ...prev, [assignmentId]: mode }));
  };
  const setSubmitUrlFor = (assignmentId: number, value: string) => {
    setSubmitUrls((prev) => ({ ...prev, [assignmentId]: value }));
  };
  const setPendingSubmissionFileFor = (assignmentId: number, file: File | null) => {
    setPendingSubmissionFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

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
      setSubmitUrlFor(a.id, '');
      setPendingSubmissionFileFor(a.id, null);
      if (submissionFileInputRef.current) submissionFileInputRef.current.value = '';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmittingFor(null);
    }
  };

  const publishedAssignments = assignments.filter((a) => !a.is_draft);
    return (
      <div className='space-y-4'>
        {isLoading ? <AssignmentsLoadingState isStudent /> : <StudentSummaryCard courseId={courseId} />}
        {!isLoading && publishedAssignments.length > 0 && (
          <div className='flex justify-end'>
            <a
              href={courseAssignmentsIcsUrl(courseId)}
              className='inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground'
            >
              <CalendarPlus className='w-3 h-3' /> Subscribe to all deadlines (.ics)
            </a>
          </div>
        )}
        {!isLoading && publishedAssignments.length === 0 && (
          <AssignmentsEmptyState isStudent hasItems={assignments.length > 0} />
        )}
        {!isLoading && publishedAssignments.map((a) => (
          <StudentAssignmentCard
            key={a.id}
            courseOfferingPublicId={courseId}
            assignment={a}
            submitMode={submitModeFor(a.id)}
            onSubmitModeChange={(mode) => setSubmitModeFor(a.id, mode)}
            submitUrl={submitUrlFor(a.id)}
            onSubmitUrlChange={(value) => setSubmitUrlFor(a.id, value)}
            pendingFile={pendingSubmissionFileFor(a.id)}
            onPendingFileChange={(file) => setPendingSubmissionFileFor(a.id, file)}
            fileInputRef={submissionFileInputRef}
            isSubmitting={submittingFor === a.id}
            onSubmit={() => handleStudentSubmit(a)}
          />
        ))}
      </div>
    );
}
