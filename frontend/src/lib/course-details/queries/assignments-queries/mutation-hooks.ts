import { useMutation, useQueryClient } from '@/lib/async-query';
import {
  createAssignment,
  deleteAssignment,
  deleteAssignmentAttachment,
  duplicateAssignment,
  gradeSubmission,
  grantExtension,
  grantExtensionBatch,
  submitWork,
  suggestGradeWithAi,
  updateAssignment,
  uploadAssignmentAttachments,
  uploadSubmissionFile
} from '@/lib/course-details/services/assignments-service';
import type {
  CreateAssignmentInput,
  GradeInput,
  GrantExtensionBatchInput,
  GrantExtensionInput,
  SubmitWorkInput,
  UpdateAssignmentInput
} from '@/lib/course-details/services/assignments-types';
import { assignmentKeys } from './keys';

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

export function useDuplicateAssignment(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => duplicateAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.list(courseOfferingId) });
    }
  });
}

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
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    }
  });
}

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
