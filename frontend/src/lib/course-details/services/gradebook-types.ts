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
  maxMarks: number;
  earned: number | null;
  attempts: number;
  taken: boolean;
}

export interface GradebookRow {
  studentId: number;
  name: string;
  email: string;
  number: string | null;
  assignments: Record<string, GradebookAssignmentCell | null>;
  quizzes: Record<string, GradebookQuizCell | null>;
  /** Weighted score as % of course max marks. */
  overallPct: number | null;
  overallEarned: number;
  gradedCount: number;
}

export interface GradebookColumns {
  assignments: { id: number; title: string; maxMarks: number }[];
  quizzes: { id: number; title: string; maxMarks: number }[];
}

export interface GradebookClassAverages {
  assignments: Record<string, number | null>;
  quizzes: Record<string, number | null>;
  overall: number | null;
  overallEarned: number | null;
}

export interface GradebookMarkBudget {
  courseMax: number;
  allocated: number;
  remaining: number;
}

export interface Gradebook {
  courseMaxMarks: number;
  markBudget: GradebookMarkBudget;
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
  maxMarks?: number;
  grade?: number | null;
  submitted?: boolean;
  late?: boolean;
  reviewed?: boolean;
  dueAt?: string | null;
  attempts?: number;
  taken?: boolean;
}

export interface MyGrades {
  items: MyGradeItem[];
  courseMaxMarks: number;
  overallPct: number | null;
  overallEarned: number;
  gradedCount: number;
  totalItems: number;
}
