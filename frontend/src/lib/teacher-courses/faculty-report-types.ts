export interface FacultyReportListRow {
  id: number;
  name: string;
  code: string | null;
  departments: number;
  courses: number;
  students: number;
  quizzes: number;
  assignments: number;
  resources: number;
  failed: number;
  avgOverallPct: number | null;
  avgOverallMarks: number | null;
}

export interface FacultyReportFilterOptions {
  faculties: { id: string; name: string; code: string | null }[];
}

export interface FacultyReportListResponse {
  generatedAt: string;
  rows: FacultyReportListRow[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  filterOptions?: FacultyReportFilterOptions;
}

export interface FacultyReportListParams {
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  q?: string;
  facultyId?: string;
  sort?: string;
}

export interface FacultyReportCourseRow {
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

export interface FacultyReportDepartmentRow {
  id: number;
  name: string;
  courses: number;
  students: number;
}

export interface FacultyReportDetail {
  generatedAt: string;
  faculty: {
    id: number;
    name: string;
    code: string | null;
  };
  summary: {
    departments: number;
    courses: number;
    students: number;
    quizzes: number;
    assignments: number;
    resources: number;
    failed: number;
    avgOverallPct: number | null;
    avgOverallMarks: number | null;
  };
  departments: FacultyReportDepartmentRow[];
  courses: FacultyReportCourseRow[];
}
