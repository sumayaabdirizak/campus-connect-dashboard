import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  createAssignment,
  deleteAssignment,
  deleteAssignmentAttachment,
  duplicateAssignment,
  getAssignments,
  getMyAssignmentSummary,
  getMySubmission,
  getSubmissions,
  gradeSubmission,
  grantExtension,
  grantExtensionBatch,
  listExtensions,
  submitWork,
  suggestGradeWithAi,
  updateAssignment,
  uploadAssignmentAttachments,
  uploadSubmissionFile
} from './assignments-service';
import type {
  CreateAssignmentInput,
  GradeInput,
  GrantExtensionBatchInput,
  GrantExtensionInput,
  SubmitWorkInput,
  UpdateAssignmentInput
} from './assignments-types';

export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (courseOfferingId: string) => [...assignmentKeys.all, 'list', courseOfferingId] as const,
  submissions: (assignmentId: number) =>
    [...assignmentKeys.all, 'submissions', assignmentId] as const,
  mySubmission: (assignmentId: number) =>
    [...assignmentKeys.all, 'my-submission', assignmentId] as const,
  mySummary: (courseOfferingId: string) =>
    [...assignmentKeys.all, 'my-summary', courseOfferingId] as const,
  extensions: (assignmentId: number) =>
    [...assignmentKeys.all, 'extensions', assignmentId] as const
};

export function useAssignments(courseOfferingId: string) {
  return useQuery({
    queryKey: assignmentKeys.list(courseOfferingId),
    queryFn: () => getAssignments(courseOfferingId)
  });
}

export function useSubmissions(assignmentId: number | null) {
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.submissions(assignmentId)
      : ['assignments', 'submissions', 'none'],
    queryFn: () => (assignmentId ? getSubmissions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId
  });
}

export function useExtensions(assignmentId: number | null) {
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.extensions(assignmentId)
      : ['assignments', 'extensions', 'none'],
    queryFn: () => (assignmentId ? listExtensions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId
  });
}

export function useCreateAssignment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => createAssignment(courseOfferingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

export function useUpdateAssignment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateAssignmentInput }) =>
      updateAssignment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

export function useDeleteAssignment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

/// Deep-clone an assignment. Invalidates the list so the new "Copy of …"
/// draft slides into the table immediately.
export function useDuplicateAssignment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => duplicateAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

/// Bug fix: previously these hooks bound `assignmentId` at instantiation
/// time, so a component holding a single mutation instance for "the
/// currently selected assignment" would silently send writes to whichever
/// assignment was selected at last render. When a click flipped the
/// selection AND triggered a mutate in the same tick, the request went to
/// the old id (or 0 when nothing was selected before).
///
/// Fix: take the assignmentId in the mutation's input object. The component
/// passes it per-call so the request always targets the intended row.
export function useGradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      input
    }: {
      assignmentId: number;
      input: GradeInput;
    }) => gradeSubmission(assignmentId, input),
    onSuccess: (_data, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(assignmentId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    }
  });
}

export function useGrantExtension() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      input
    }: {
      assignmentId: number;
      input: GrantExtensionInput;
    }) => grantExtension(assignmentId, input),
    onSuccess: (_data, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.extensions(assignmentId) });
    }
  });
}

export function useGrantExtensionBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      input
    }: {
      assignmentId: number;
      input: GrantExtensionBatchInput;
    }) => grantExtensionBatch(assignmentId, input),
    onSuccess: (_data, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.extensions(assignmentId) });
    }
  });
}

export function useSubmitWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      input
    }: {
      assignmentId: number;
      input: SubmitWorkInput;
    }) => submitWork(assignmentId, input),
    onSuccess: (_data, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(assignmentId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.mySubmission(assignmentId) });
      // List query carries `_count.submissions` — refresh so the teacher's
      // assignment list reflects the new submission count instantly.
      // Broad `all` invalidation also catches the student's `mySummary`
      // which depends on aggregate submission state.
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    }
  });
}

/// Student-side course-wide summary — drives the rollup card at the top
/// of the student assignments view. Cheap server aggregate.
export function useMyAssignmentSummary(courseOfferingId: string) {
  return useQuery({
    queryKey: assignmentKeys.mySummary(courseOfferingId),
    queryFn: () => getMyAssignmentSummary(courseOfferingId),
  });
}

/// Student-side query for their own submission row. Returns null when the
/// student hasn't submitted yet. Used by the student card to render
/// "Submitted X · Score Y%" without ever touching the teacher-only
/// submissions list.
export function useMySubmission(assignmentId: number | null) {
  return useQuery({
    queryKey: assignmentId
      ? assignmentKeys.mySubmission(assignmentId)
      : ['assignments', 'my-submission', 'none'],
    queryFn: () => (assignmentId ? getMySubmission(assignmentId) : Promise.resolve(null)),
    enabled: !!assignmentId
  });
}

/// File upload for student submissions. Returns the URL the regular
/// `useSubmitWork` mutation should be called with. Two-step on purpose —
/// the JSON submit endpoint stays the same for link / text / file paths.
export function useUploadSubmissionFile() {
  return useMutation({
    mutationFn: ({ assignmentId, file }: { assignmentId: number; file: File }) =>
      uploadSubmissionFile(assignmentId, file)
  });
}

export function useUploadAttachments(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, files }: { assignmentId: number; files: File[] }) =>
      uploadAssignmentAttachments(assignmentId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

export function useDeleteAttachment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, attachmentId }: { assignmentId: number; attachmentId: number }) =>
      deleteAssignmentAttachment(assignmentId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

export function useSuggestGradeWithAi() {
  return useMutation({
    mutationFn: ({
      assignmentId,
      submissionId
    }: {
      assignmentId: number;
      submissionId: number;
    }) => suggestGradeWithAi(assignmentId, submissionId)
  });
}
