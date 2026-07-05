import { apiClient } from '@/lib/api-client';
import { buildApiUrl } from '@/lib/api-config';
import { uploadJson } from '@/lib/upload-client';
import type {
  AiGradeSuggestion,
  Assignment,
  AssignmentAttachment,
  CreateAssignmentInput,
  GradeInput,
  GrantExtensionBatchInput,
  GrantExtensionInput,
  StudentAssignmentSummary,
  Submission,
  SubmissionExtension,
  SubmitWorkInput,
  UpdateAssignmentInput
} from './assignments-types';

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

/// Deep-clone an assignment (including attachment rows — the underlying
/// files on disk are shared by URL, not duplicated). Lands as a draft.
export async function duplicateAssignment(assignmentId: number): Promise<Assignment> {
  return apiClient<Assignment>(`/course-offerings/${assignmentId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({})
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

/// Fetch the calling student's own submission (or null if none yet). Lets
/// the student card render its actual state without scanning the teacher's
/// submissions list.
export async function getMySubmission(assignmentId: number): Promise<Submission | null> {
  return apiClient<Submission | null>(`/course-offerings/${assignmentId}/my-submission`);
}

/// Course-wide grade summary for the calling student. Powers the rollup
/// card at the top of the student assignments view.
export async function getMyAssignmentSummary(
  courseOfferingId: string
): Promise<StudentAssignmentSummary> {
  return apiClient<StudentAssignmentSummary>(
    `/course-offerings/course/${courseOfferingId}/my-summary`
  );
}

/// Upload a single file for a student submission. Returns the URL the
/// regular `submitWork` endpoint should be called with. Two-step on purpose:
/// the submit endpoint stays JSON-only and identical for link / text / file.
export async function uploadSubmissionFile(
  assignmentId: number,
  file: File
): Promise<{ url: string; originalName: string; mimeType: string; size: number }> {
  const formData = new FormData();
  formData.append('file', file);
  return uploadJson<{ url: string; originalName: string; mimeType: string; size: number }>(
    `/course-offerings/${assignmentId}/submissions/upload`,
    formData
  );
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
  return uploadJson<{ count: number; attachments: AssignmentAttachment[] }>(
    `/course-offerings/${assignmentId}/attachments`,
    formData
  );
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
  return buildApiUrl(`/course-offerings/attachments/${attachmentId}/download`);
}

/// Single-assignment iCalendar feed.
export function assignmentIcsUrl(assignmentId: number): string {
  return buildApiUrl(`/course-offerings/${assignmentId}/calendar.ics`);
}

/// All assignments in this offering as one .ics — useful for "subscribe once".
export function courseAssignmentsIcsUrl(courseOfferingId: string | number): string {
  return buildApiUrl(`/course-offerings/course/${courseOfferingId}/calendar.ics`);
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
