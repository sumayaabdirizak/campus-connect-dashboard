import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  createAssignment,
  deleteAssignment,
  deleteAssignmentAttachment,
  getAssignments,
  getSubmissions,
  gradeSubmission,
  grantExtension,
  grantExtensionBatch,
  listExtensions,
  submitWork,
  suggestGradeWithAi,
  updateAssignment,
  uploadAssignmentAttachments
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

export function useGradeSubmission(assignmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GradeInput) => gradeSubmission(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(assignmentId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    }
  });
}

export function useGrantExtension(assignmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GrantExtensionInput) => grantExtension(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.extensions(assignmentId) });
    }
  });
}

export function useGrantExtensionBatch(assignmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GrantExtensionBatchInput) => grantExtensionBatch(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.extensions(assignmentId) });
    }
  });
}

export function useSubmitWork(assignmentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitWorkInput) => submitWork(assignmentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(assignmentId) });
    }
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
