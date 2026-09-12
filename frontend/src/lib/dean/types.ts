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
  registration?: {
    batchSectionId: number;
    batchSectionName: string;
    batchId: number;
    batchName: string;
    departmentId: number;
    departmentName: string;
  } | null;
}

export interface DeanBatch {
  id: number;
  name: string;
  academic_year: number;
  semester_number: number;
  cohortSemester?: number;
  maxSemesters?: number;
  currentAcademicYearName?: string;
  currentSemesterInYear?: number;
  program: {
    id: number;
    name: string;
    code: string;
    level?: 'UNDERGRADUATE' | 'POSTGRADUATE' | string;
    department: { id: number; name: string };
  };
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

export type DeanUsersListResponse = {
  users?: DeanUser[];
  results?: DeanUser[];
  total?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  pagination?: { total: number; page: number; pageSize: number };
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
    onTimeRate: number;
    courseCompletionRate: number;
    trends: Record<string, number>;
  };
  charts: {
    enrollmentTrends: { month: string; enrollments: number; withdrawals: number; graduations: number }[];
    departmentPerformance: { department: string; gpa: number; passRate: number; completionRate: number }[];
    topCourses: { course: string; name: string; department: string; avgScore: number; completion: number; engagement: number }[];
    bottomCourses: { course: string; name: string; department: string; avgScore: number; completion: number; engagement: number }[];
    performanceDistribution: { band: string; count: number }[];
    onTimeSubmissions: {
      daily: { day: string; rate: number }[];
      monthly: { month: string; rate: number }[];
      byDepartment: { department: string; rate: number }[];
    };
    instructorPerformance: {
      name: string;
      feedback: number;
      completion: number;
      activity: number;
      quizzes?: number;
      assignments?: number;
      turnaround: number;
    }[];
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
  onTimeRate: number;
  status: string;
}

export interface DeanInstructorReportRow {
  id: number;
  instructor: string;
  department: string;
  courses: number;
  rating: number;
  completion: number;
  activity?: number;
  quizzes?: number;
  assignments?: number;
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
  onTimeRate: number;
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
