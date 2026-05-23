import { apiClient } from '@/lib/api-client';
import { ensureCsrfToken } from '@/lib/api-client';
import type {
  AiGradeSuggestion,
  Assignment,
  AssignmentAttachment,
  CreateAssignmentInput,
  GradeInput,
  GrantExtensionBatchInput,
  GrantExtensionInput,
  Submission,
  SubmissionExtension,
  SubmitWorkInput,
  UpdateAssignmentInput
} from './assignments-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function getAssignments(courseOfferingId: string): Promise<Assignment[]> {
  return apiClient<Assignment[]>(`/course-offerings/${courseOfferingId}`);
}

export async function createAssignment(
  courseOfferingId: string,
  input: CreateAssignmentInput
): Promise<Assignment> {
  return apiClient<Assignment>(`/course-offerings/${courseOfferingId}`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function updateAssignment(
  assignmentId: number,
  input: UpdateAssignmentInput
): Promise<Assignment> {
  return apiClient<Assignment>(`/course-offerings/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input)
  });
}

export async function deleteAssignment(assignmentId: number): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(`/course-offerings/${assignmentId}`, {
    method: 'DELETE'
  });
}

export async function getSubmissions(assignmentId: number): Promise<Submission[]> {
  return apiClient<Submission[]>(`/course-offerings/${assignmentId}/submissions`);
}

export async function gradeSubmission(
  assignmentId: number,
  input: GradeInput
): Promise<Submission> {
  return apiClient<Submission>(
    `/course-offerings/${assignmentId}/submissions/${input.submissionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        grade: input.grade,
        feedback: input.feedback,
        is_reviewed: input.is_reviewed
      })
    }
  );
}

export async function submitWork(
  assignmentId: number,
  input: SubmitWorkInput
): Promise<Submission> {
  return apiClient<Submission>(`/course-offerings/${assignmentId}/submissions`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function listExtensions(assignmentId: number): Promise<SubmissionExtension[]> {
  return apiClient<SubmissionExtension[]>(`/course-offerings/${assignmentId}/extensions`);
}

export async function grantExtension(
  assignmentId: number,
  input: GrantExtensionInput
): Promise<SubmissionExtension> {
  return apiClient<SubmissionExtension>(`/course-offerings/${assignmentId}/extensions`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function grantExtensionBatch(
  assignmentId: number,
  input: GrantExtensionBatchInput
): Promise<{ count: number; extensions: SubmissionExtension[] }> {
  return apiClient<{ count: number; extensions: SubmissionExtension[] }>(
    `/course-offerings/${assignmentId}/extensions/batch`,
    { method: 'POST', body: JSON.stringify(input) }
  );
}

/// Uploads files via multipart/form-data. `apiClient` is JSON-only, so this
/// hits the same backend directly with credentials + CSRF token preserved.
export async function uploadAssignmentAttachments(
  assignmentId: number,
  files: File[]
): Promise<{ count: number; attachments: AssignmentAttachment[] }> {
  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  const csrfToken = await ensureCsrfToken();
  const res = await fetch(`${API_BASE_URL}/course-offerings/${assignmentId}/attachments`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function deleteAssignmentAttachment(
  assignmentId: number,
  attachmentId: number
): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(
    `/course-offerings/${assignmentId}/attachments/${attachmentId}`,
    { method: 'DELETE' }
  );
}

/// Force-download URL for an attachment (sets Content-Disposition on the
/// server). Auth is sent automatically via cookies.
export function attachmentDownloadUrl(attachmentId: number): string {
  return `${API_BASE_URL}/course-offerings/attachments/${attachmentId}/download`;
}

/// Single-assignment iCalendar feed.
export function assignmentIcsUrl(assignmentId: number): string {
  return `${API_BASE_URL}/course-offerings/${assignmentId}/calendar.ics`;
}

/// All assignments in this offering as one .ics — useful for "subscribe once".
export function courseAssignmentsIcsUrl(courseOfferingId: string | number): string {
  return `${API_BASE_URL}/course-offerings/course/${courseOfferingId}/calendar.ics`;
}

export async function suggestGradeWithAi(
  assignmentId: number,
  submissionId: number
): Promise<AiGradeSuggestion> {
  return apiClient<AiGradeSuggestion>(
    `/course-offerings/${assignmentId}/submissions/${submissionId}/ai-suggest`,
    { method: 'POST', body: JSON.stringify({}) }
  );
}
