export interface LecturerReportListRow {
  id: number;
  name: string;
  number: string | null;
  department: string | null;
  courses: number;
  students: number;
  quizzes: number;
  assignments: number;
  resources: number;
  failed: number;
  avgOverallPct: number | null;
  avgOverallMarks: number | null;
}

export interface LecturerReportFilterOptions {
  departments: string[];
  lecturers: {
    id: string;
    name: string;
    number: string | null;
    department: string | null;
  }[];
}

export interface LecturerReportListResponse {
  generatedAt: string;
  rows: LecturerReportListRow[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  filterOptions?: LecturerReportFilterOptions;
}

export interface LecturerReportListParams {
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  q?: string;
  department?: string;
  lecturerId?: string;
  sort?: string;
}

export interface LecturerReportCourseRow {
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
  avgOverallMarks: number | null;
  courseMaxMarks?: number;
}

export interface LecturerReportDetail {
  generatedAt: string;
  lecturer: {
    id: number;
    name: string;
    number: string | null;
    department: string | null;
  };
  summary: {
    courses: number;
    students: number;
    quizzes: number;
    assignments: number;
    resources: number;
    failed: number;
    avgOverallPct: number | null;
    avgOverallMarks: number | null;
  };
  courses: LecturerReportCourseRow[];
}
