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
  avgOverallMarks?: number | null;
  courseMaxMarks?: number;
}

export interface CourseReportFilterOptions {
  departments: string[];
  courses: {
    id: string;
    label: string;
    department: string | null;
    section: string;
    batch: string | null;
  }[];
}

export interface CourseReportListResponse {
  generatedAt: string;
  rows: CourseReportListRow[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  filterOptions?: CourseReportFilterOptions;
}

export interface CourseReportListParams {
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  q?: string;
  department?: string;
  courseId?: string;
  sort?: string;
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
  overallMarks: number | null;
  status: 'Failed' | 'Passed' | 'No grade' | 'Missing' | 'Not submitted';
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
    avgOverallMarks?: number | null;
    courseMaxMarks?: number;
    passedCount: number;
    failedCount: number;
    ungradedCount: number;
    noGradeCount?: number;
    missingCount?: number;
    notSubmittedCount?: number;
  };
  failedStudents: {
    studentId: number;
    name: string;
    number: string | null;
    overallPct: number;
    overallMarks?: number;
  }[];
  students: CourseReportStudentRow[];
}
