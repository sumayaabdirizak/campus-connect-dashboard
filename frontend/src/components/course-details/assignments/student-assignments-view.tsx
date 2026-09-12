'use client';

import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { useAssignments, useSubmitWork, useUploadSubmissionFile } from '@/lib/course-details/queries/assignments-queries';

import type { Assignment } from '@/lib/course-details/services/assignments-types';
import { useCourseLiveNow } from '@/components/course-details/course-live-clock';
import { CourseTabHeader } from '../_shared/course-tab-header';
import { CourseTabPage } from '../_shared/course-tab-page';
import { StudentAssignmentCard } from './student-assignment-card';
import { StudentAssignmentDetailPage } from './student-assignment-card/student-assignment-detail-page';
import { AssignmentsLoadingState, AssignmentsEmptyState } from './shared';

function readAssignmentIdFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URL(window.location.href).searchParams.get('assignmentId');
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function writeAssignmentIdToUrl(id: number | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'assignments');
  if (id == null) url.searchParams.delete('assignmentId');
  else url.searchParams.set('assignmentId', String(id));
  window.history.replaceState({}, '', url.toString());
}

export function StudentAssignmentsView({ courseId }: { courseId: string }) {
  useCourseLiveNow();
  const { data: assignments = [], isLoading } = useAssignments(courseId, { live: true });

  const [selectedId, setSelectedId] = useState<number | null>(() => readAssignmentIdFromUrl());

  const [submitModes, setSubmitModes] = useState<Record<number, 'link' | 'file'>>({});
  const [submitUrls, setSubmitUrls] = useState<Record<number, string>>({});
  const [pendingSubmissionFiles, setPendingSubmissionFiles] = useState<
    Record<number, File | null>
  >({});
  const submissionFileInputRef = useRef<HTMLInputElement | null>(null);
  const [submittingFor, setSubmittingFor] = useState<number | null>(null);

  const publishedAssignments = assignments.filter((a) => !a.is_draft);
  const selectedAssignment =
    selectedId == null
      ? null
      : publishedAssignments.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId == null || isLoading) return;
    const stillExists = assignments.some((a) => a.id === selectedId && !a.is_draft);
    if (!stillExists) {
      setSelectedId(null);
      writeAssignmentIdToUrl(null);
    }
  }, [selectedId, isLoading, assignments]);

  const openAssignment = (id: number) => {
    setSelectedId(id);
    writeAssignmentIdToUrl(id);
  };

  const closeAssignment = () => {
    setSelectedId(null);
    writeAssignmentIdToUrl(null);
  };

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

  if (selectedAssignment) {
    return (
      <StudentAssignmentDetailPage
        assignment={selectedAssignment}
        onBack={closeAssignment}
        submitMode={submitModeFor(selectedAssignment.id)}
        onSubmitModeChange={(mode) =>
          setSubmitModes((prev) => ({ ...prev, [selectedAssignment.id]: mode }))
        }
        submitUrl={submitUrlFor(selectedAssignment.id)}
        onSubmitUrlChange={(value) =>
          setSubmitUrls((prev) => ({ ...prev, [selectedAssignment.id]: value }))
        }
        pendingFile={pendingSubmissionFileFor(selectedAssignment.id)}
        onPendingFileChange={(file) =>
          setPendingSubmissionFiles((prev) => ({
            ...prev,
            [selectedAssignment.id]: file
          }))
        }
        fileInputRef={submissionFileInputRef}
        isSubmitting={submittingFor === selectedAssignment.id}
        onSubmit={() => handleStudentSubmit(selectedAssignment)}
      />
    );
  }

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
        <div className='grid grid-cols-1 items-stretch gap-4 md:grid-cols-2'>
          {publishedAssignments.map((a) => (
            <StudentAssignmentCard
              key={a.id}
              assignment={a}
              onOpen={() => openAssignment(a.id)}
            />
          ))}
        </div>
      ) : null}
    </CourseTabPage>
  );
}
