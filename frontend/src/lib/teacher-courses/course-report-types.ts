export interface CourseReportListRow {
  id: string;
  courseCode: string;
  courseName: string;
  department: string | null;
  section: string;
  batch: string | null;
  students: number;
  quizzes: number;
  assignments: number;
  resources: number;
  failed: number;
  avgOverallPct: number | null;
}

export interface CourseReportListResponse {
  generatedAt: string;
  rows: CourseReportListRow[];
}

export interface CourseReportContentItem {
  id: number;
  title: string;
  dueAt?: string | null;
  type?: string;
}

export interface CourseReportStudentRow {
  studentId: number;
  name: string;
  number: string | null;
  overallPct: number | null;
  status: 'Failed' | 'Passed' | 'No grades';
}

export interface CourseReportDetail {
  generatedAt: string;
  course: {
    id: string;
    courseCode: string;
    courseName: string;
    department: string | null;
    section: string;
    batch: string | null;
  };
  content: {
    quizzes: number;
    assignments: number;
    resources: number;
    quizItems: CourseReportContentItem[];
    assignmentItems: CourseReportContentItem[];
    resourceItems: CourseReportContentItem[];
  };
  classSummary: {
    studentCount: number;
    avgOverallPct: number | null;
    passedCount: number;
    failedCount: number;
    ungradedCount: number;
  };
  failedStudents: {
    studentId: number;
    name: string;
    number: string | null;
    overallPct: number;
  }[];
  students: CourseReportStudentRow[];
}
