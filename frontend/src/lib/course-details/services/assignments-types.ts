import type { GroupInfo } from './groups-types';

export type AssignmentWorkMode = 'INDIVIDUAL' | 'GROUP';
export type AssignmentGradingScope = 'INDIVIDUAL' | 'GROUP';

export interface AssignmentAttachment {
  id: number;
  assignmentId: number;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  uploadedById: number;
  created_at: string;
  uploadedBy?: { id: number; full_name: string };
}

export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  open_at: string | null;
  due_date: string;
  courseOfferingId: number;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  workMode: AssignmentWorkMode;
  gradingScope: AssignmentGradingScope;
  lateWindowMinutes: number;
  maxMarks: number;
  attachments?: AssignmentAttachment[];
  _count?: { submissions: number };
  submissions?: Array<{
    id: number;
    studentId: number;
    grade: number | null;
    is_reviewed: boolean;
  }>;
  /// Teacher list only — count of submissions with `is_reviewed === false`.
  /// Drives the "X to grade" badge on the assignment card so the teacher
  /// spots pending work without opening each row. Server-computed.
  pendingGradingCount?: number;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  groupId: number | null;
  content_url: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  is_reviewed: boolean;
  is_late: boolean;
  student?: {
    id: number;
    full_name: string;
    email: string;
    number: string;
  };
  /// Populated on the `my-submission` endpoint only — the student's effective
  /// extension deadline (from student-level or group-level extension, whichever
  /// is later). Null if no extension has been granted.
  _extension?: {
    newDueAt: string;
    reason: string | null;
  } | null;
  /// Sentinel flag: when true the response represents "no submission yet"
  /// (but may carry `_extension`). The component should treat this as null.
  _noSubmission?: true;
  /// Group info for GROUP-mode assignments — group name, members, and
  /// whether the current student is the leader.
  _groupInfo?: GroupInfo | null;
}

export interface SubmissionExtension {
  id: number;
  assignmentId: number;
  studentId: number | null;
  groupId: number | null;
  newDueAt: string;
  reason: string | null;
  grantedById: number;
  created_at: string;
  student?: { id: number; full_name: string; number: string };
  group?: { id: number; name: string };
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  open_at?: string | null;
  due_date: string;
  is_draft?: boolean;
  workMode?: AssignmentWorkMode;
  gradingScope?: AssignmentGradingScope;
  lateWindowMinutes?: number;
  maxMarks?: number;
}

export type UpdateAssignmentInput = Partial<CreateAssignmentInput>;

export interface GradeInput {
  submissionId: number;
  grade?: number;
  feedback?: string;
  is_reviewed?: boolean;
}

export interface GrantExtensionInput {
  studentId?: number;
  groupId?: number;
  newDueAt: string;
  reason?: string;
}

export interface GrantExtensionBatchInput {
  studentIds?: number[];
  groupIds?: number[];
  newDueAt: string;
  reason?: string;
}

export interface SubmitWorkInput {
  link?: string;
  content?: string;
}

/// Student-side rollup for the summary card at the top of the assignments
/// tab. Server-aggregated so the wire stays small even in courses with
/// hundreds of assignments.
export interface StudentAssignmentSummary {
  totalPublished: number;
  submittedCount: number;
  gradedCount: number;
  lateCount: number;
  missingCount: number;
  avgGrade: number | null;
}

export interface AiGradeSuggestion {
  suggestedGrade: number;
  suggestedFeedback: string;
  reasoningSummary: string;
  confidence: 'low' | 'medium' | 'high';
  model: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}
