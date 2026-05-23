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
  attachments?: AssignmentAttachment[];
  _count?: { submissions: number };
  submissions?: Array<{
    id: number;
    studentId: number;
    grade: number | null;
    is_reviewed: boolean;
  }>;
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
