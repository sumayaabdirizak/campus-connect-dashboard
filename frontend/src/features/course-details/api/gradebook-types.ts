export interface GradebookAssignmentCell {
  grade: number | null;
  maxMarks: number;
  pct: number | null;
  submitted: boolean;
  late: boolean;
  reviewed: boolean;
}

export interface GradebookQuizCell {
  pct: number | null;
  attempts: number;
  taken: boolean;
}

export interface GradebookRow {
  studentId: number;
  name: string;
  email: string;
  number: string | null;
  /** Keyed by assignment id; null means no submission. */
  assignments: Record<string, GradebookAssignmentCell | null>;
  /** Keyed by quiz id; null means no attempt. */
  quizzes: Record<string, GradebookQuizCell | null>;
  /** Average of graded percentages across all items, or null if none graded. */
  overallPct: number | null;
  gradedCount: number;
}

export interface GradebookColumns {
  assignments: { id: number; title: string; maxMarks: number }[];
  quizzes: { id: number; title: string }[];
}

export interface GradebookClassAverages {
  assignments: Record<string, number | null>;
  quizzes: Record<string, number | null>;
  overall: number | null;
}

export interface Gradebook {
  columns: GradebookColumns;
  students: GradebookRow[];
  classAverages: GradebookClassAverages;
  studentCount: number;
}

export interface MyGradeItem {
  kind: 'assignment' | 'quiz';
  id: number;
  title: string;
  pct: number | null;
  /** Assignment-only fields. */
  maxMarks?: number;
  grade?: number | null;
  submitted?: boolean;
  late?: boolean;
  reviewed?: boolean;
  dueAt?: string | null;
  /** Quiz-only fields. */
  attempts?: number;
  taken?: boolean;
}

export interface MyGrades {
  items: MyGradeItem[];
  overallPct: number | null;
  gradedCount: number;
  totalItems: number;
}
