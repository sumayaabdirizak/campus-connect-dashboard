export interface StudentWorkAssignment {
  id: number;
  title: string;
  due_date: string;
  gradingScope: 'INDIVIDUAL' | 'GROUP';
}

export interface StudentWorkSubmission {
  id: number;
  assignmentId: number;
  grade: number | null;
  feedback: string | null;
  is_late: boolean;
  is_reviewed: boolean;
  submitted_at: string;
  content_url: string;
}

export interface StudentWorkQuizAttempt {
  id: number;
  quizId: number;
  score: number | null;
  grade: number | null;
  submitted_at: string | null;
  quiz: { id: number; title: string; passing_score: number };
}

export interface StudentWorkStats {
  totalAssignments: number;
  submittedCount: number;
  missingCount: number;
  lateCount: number;
  gradedCount: number;
  avgGrade: number | null;
}

export interface StudentWork {
  assignments: StudentWorkAssignment[];
  submissions: StudentWorkSubmission[];
  quizAttempts: StudentWorkQuizAttempt[];
  stats: StudentWorkStats;
}
