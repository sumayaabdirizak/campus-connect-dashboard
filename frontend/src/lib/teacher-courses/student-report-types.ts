export interface StudentReportListRow {
  id: string;
  studentId: number;
  studentName: string;
  studentNumber: string | null;
  offeringId: string;
  courseCode: string;
  courseName: string;
  department: string | null;
  section: string;
  batch: string | null;
  batchId: number | null;
  overallMarks: number | null;
  overallPct: number | null;
  courseMaxMarks: number;
  status: 'Failed' | 'Passed' | 'No grade' | 'Missing' | 'Not submitted';
}

export interface StudentReportFilterOptions {
  departments: string[];
  batches: { id: string; name: string }[];
  sections: string[];
  courses: {
    id: string;
    label: string;
    department: string | null;
    section: string;
    batch: string | null;
  }[];
  students?: {
    id: string;
    name: string;
    number: string | null;
    department: string | null;
  }[];
}

export interface StudentReportListResponse {
  generatedAt: string;
  rows: StudentReportListRow[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  filterOptions: StudentReportFilterOptions;
}

export interface StudentReportListParams {
  from?: string | null;
  to?: string | null;
  page?: number;
  pageSize?: number;
  q?: string;
  department?: string;
  courseId?: string;
  studentId?: string;
  sort?: string;
}

export interface StudentReportDetail {
  generatedAt: string;
  student: {
    studentId: number;
    name: string;
    number: string | null;
    overallMarks: number | null;
    overallPct: number | null;
    status: 'Failed' | 'Passed' | 'No grade' | 'Missing' | 'Not submitted';
  };
  course: {
    id: string;
    courseCode: string;
    courseName: string;
    department: string | null;
    section: string;
    batch: string | null;
  };
  classSummary: {
    courseMaxMarks: number;
  };
  content: {
    quizzes: number;
    assignments: number;
    resources: number;
    quizItems: {
      id: number;
      title: string;
      dueAt?: string | null;
      status?: 'Failed' | 'Passed' | 'No grade' | 'Missing' | 'Not submitted';
      score?: number | null;
      maxMarks?: number | null;
    }[];
    assignmentItems: {
      id: number;
      title: string;
      dueAt?: string | null;
      status?: 'Failed' | 'Passed' | 'No grade' | 'Missing' | 'Not submitted';
      score?: number | null;
      maxMarks?: number | null;
    }[];
    resourceItems: { id: number; title: string; type?: string }[];
  };
}
