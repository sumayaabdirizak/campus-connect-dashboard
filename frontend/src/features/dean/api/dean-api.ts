import { apiClient } from '@/lib/api-client';

const BASE = '/dean';

// ── Types ──────────────────────────────────────────────────────────────────

export interface DeanUser {
  id: number;
  full_name: string;
  email: string;
  number: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  role: string;
  studentProfile?: {
    student_number: string;
    admission_year: number;
    facultyId: number;
    departmentId: number;
    programId: number;
  };
  lecturerProfile?: {
    specialty?: string;
    hire_date?: string;
    faculties?: { faculty: { id: number; name: string; code: string } }[];
  };
}

export interface DeanBatch {
  id: number;
  name: string;
  academic_year: number;
  semester_number: number;
  program: { id: number; name: string; code: string; department: { id: number; name: string } };
  academicYear: { id: number; name: string };
  sections: DeanSection[];
  _count?: { sections: number };
}

export interface DeanSection {
  id: number;
  name: string;
  batchId: number;
  _count?: { studentRegistrations: number; courseOfferings: number };
}

export interface TeacherAssigning {
  id: number;
  teacher: { id: number; full_name: string; email: string; number: string };
  course: { id: number; name: string; code: string };
  assigned_at: string;
}

export interface CourseOffering {
  id: number;
  course: { id: number; name: string; code: string; credits: number };
  section: { id: number; name: string; batch: { name: string; program: { name: string } } };
  semester: { id: number; name: string };
  academicYear: { id: number; name: string };
}

export interface Course {
  id: number;
  name: string;
  code: string;
  description?: string;
  credits: number;
  department: { id: number; name: string; code: string };
  _count?: { offerings: number; teacherAssignings: number };
}

// ── User Management (read-only) ────────────────────────────────────────────

type DeanUsersPaginatedApi = {
  results: DeanUser[];
  total: number;
  page: number;
  pageSize: number;
};

export type DeanUsersListResponse = {
  users: DeanUser[];
  pagination: { total: number; page: number; pageSize: number };
};

export const deanApi = {
  getUsers: async (params?: Record<string, string>): Promise<DeanUsersListResponse> => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const raw = await apiClient<DeanUsersPaginatedApi>(`${BASE}/users${query}`);
    return {
      users: raw.results ?? [],
      pagination: { total: raw.total ?? 0, page: raw.page ?? 1, pageSize: raw.pageSize ?? 20 }
    };
  },

  getUserById: (id: number) => apiClient<{ user: DeanUser }>(`${BASE}/users/${id}`),

  // Club Stats (faculty-scoped)
  getClubStats: () =>
    apiClient<{ approved: number; pending: number; suspended: number; rejected: number; total: number }>(
      '/clubs/dean/stats'
    ),

  // Batches (read-only)
  getBatches: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ batches: DeanBatch[] }>(`${BASE}/batches${query}`);
  },

  getBatchById: (id: number) => apiClient<{ batch: DeanBatch }>(`${BASE}/batches/${id}`),

  getBatchSections: (batchId: number) =>
    apiClient<{ sections: DeanSection[] }>(`${BASE}/batches/${batchId}/sections`),

  getSectionById: (id: number) => apiClient<{ section: DeanSection }>(`${BASE}/sections/${id}`),

  // Teachers (read-only)
  getTeachers: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ teachers: DeanUser[] }>(`${BASE}/teachers${query}`);
  },

  // Courses (read-only)
  getCourses: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ courses: Course[] }>(`${BASE}/courses${query}`);
  },

  getCourseById: (id: number) => apiClient<{ course: Course }>(`${BASE}/courses/${id}`),

  // Offerings (read-only)
  getOfferings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ offerings: CourseOffering[] }>(`${BASE}/offerings${query}`);
  },

  // Analytics
  getAnalytics: () => apiClient<DeanAnalytics>(`${BASE}/analytics`),

  getReports: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<DeanReports>(`${BASE}/reports${query}`);
  },
};

export interface DeanAnalytics {
  kpis: {
    activeUsers: number;
    messagesExchanged: number;
    assignmentsSubmitted: number;
    avgCourseCompletion: number;
    announcementReach: number;
    onTimeSubmissions: number;
    quizPassRate: number;
    resourceViews: number;
  };
  charts: {
    communicationActivity: { month: string; messages: number }[];
    learningProgress: { month: string; completion: number | null }[];
    submissionsByCourse: { course: string; onTime: number; late: number }[];
    quizScoreDistribution: { range: string; count: number }[];
    gradeDistribution: { grade: string; count: number }[];
    courseCompletion: { course: string; name: string; completion: number }[];
  };
}

export interface DeanReports {
  scope: {
    facultyId: number;
    facultyName: string;
    facultyCode: string;
    periodLabel: string;
    generatedAt: string;
  };
  kpis: {
    totalDepartments: number;
    totalStudents: number;
    totalInstructors: number;
    totalCourses: number;
    activeCourses: number;
    assignmentsSubmitted: number;
    quizAttempts: number;
    averageGpa: number;
    attendanceRate: number;
    courseCompletionRate: number;
    trends: Record<string, number>;
  };
  charts: {
    enrollmentTrends: { month: string; enrollments: number; withdrawals: number; graduations: number }[];
    departmentPerformance: { department: string; gpa: number; passRate: number; completionRate: number }[];
    topCourses: { course: string; name: string; department: string; avgScore: number; completion: number; engagement: number }[];
    bottomCourses: { course: string; name: string; department: string; avgScore: number; completion: number; engagement: number }[];
    performanceDistribution: { band: string; count: number }[];
    attendance: {
      daily: { day: string; rate: number }[];
      monthly: { month: string; rate: number }[];
      byDepartment: { department: string; rate: number }[];
    };
    instructorPerformance: { name: string; feedback: number; completion: number; engagement: number; turnaround: number }[];
  };
  tables: {
    academic: {
      deansList: DeanStudentReportRow[];
      probation: DeanStudentReportRow[];
      passFail: { band: string; count: number }[];
    };
    students: DeanStudentReportRow[];
    instructors: DeanInstructorReportRow[];
    courses: DeanCourseReportRow[];
    departments: DeanDepartmentReportRow[];
  };
  assessment: {
    assignments: DeanAssessmentMetrics;
    quizzes: DeanAssessmentMetrics;
    examinations: DeanAssessmentMetrics;
  };
  risks: {
    students: DeanRiskStudent[];
    courses: DeanRiskCourse[];
    departments: DeanRiskDepartment[];
  };
  insights: string[];
  recentActivity: DeanActivityItem[];
  filterOptions: {
    departments: { id: number; name: string; code: string }[];
  };
}

export interface DeanStudentReportRow {
  id: number;
  student: string;
  department: string;
  level: string;
  gpa: number;
  attendance: number;
  status: string;
}

export interface DeanInstructorReportRow {
  id: number;
  instructor: string;
  department: string;
  courses: number;
  rating: number;
  completion: number;
}

export interface DeanCourseReportRow {
  course: string;
  name: string;
  department: string;
  students: number;
  completion: number;
  avgScore: number;
}

export interface DeanDepartmentReportRow {
  department: string;
  code: string;
  gpa: number;
  passRate: number;
  completionRate: number;
  students: number;
  instructors: number;
  courses: number;
  rank?: number;
}

export interface DeanAssessmentMetrics {
  submissionRate: number;
  passRate: number;
  avgScore: number;
}

export interface DeanRiskStudent {
  id: number;
  name: string;
  department: string;
  gpa: number;
  attendance: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DeanRiskCourse {
  course: string;
  name: string;
  failureRate: number;
  completion: number;
  engagement: number;
  priority: 'high' | 'medium' | 'low';
}

export interface DeanRiskDepartment {
  department: string;
  gpa: number;
  passRate: number;
  trend: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DeanActivityItem {
  id: string;
  type: 'report' | 'alert' | 'event';
  title: string;
  description: string;
  timestamp: string;
}
