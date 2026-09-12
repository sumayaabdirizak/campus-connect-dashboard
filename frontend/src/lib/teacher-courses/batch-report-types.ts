export interface BatchReportListRow {
  id: number;
  name: string;
  status: string | null;
  programme: string | null;
  department: string | null;
  sections: number;
  students: number;
  courses: number;
  quizzes: number;
  assignments: number;
  resources: number;
  failed: number;
  avgOverallPct: number | null;
  avgOverallMarks: number | null;
}

export interface BatchReportFilterOptions {
  departments: string[];
  statuses: string[];
  batches: {
    id: string;
    name: string;
    programme: string | null;
    department: string | null;
    status: string | null;
  }[];
}

export interface BatchReportListResponse {
  generatedAt: string;
  rows: BatchReportListRow[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  filterOptions?: BatchReportFilterOptions;
}

export interface BatchReportListParams {
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  q?: string;
  department?: string;
  batchId?: string;
  status?: string;
  sort?: string;
}

export interface BatchReportCourseRow {
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

export interface BatchReportDetail {
  generatedAt: string;
  batch: {
    id: number;
    name: string;
    status: string | null;
    programme: string | null;
    department: string | null;
  };
  summary: {
    sections: number;
    students: number;
    courses: number;
    quizzes: number;
    assignments: number;
    resources: number;
    failed: number;
    avgOverallPct: number | null;
    avgOverallMarks: number | null;
  };
  sections: { id: number; name: string; students: number }[];
  courses: BatchReportCourseRow[];
}
