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
  _count?: { studentRegistrations: number; offerings: number };
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

// ── User Management ────────────────────────────────────────────────────────

/** Backend `paginatedPayload` for GET /dean/users */
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
  // Users — API returns `results` + pagination fields; normalize for the UI.
  getUsers: async (params?: Record<string, string>): Promise<DeanUsersListResponse> => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const raw = await apiClient<DeanUsersPaginatedApi>(`${BASE}/users${query}`);
    return {
      users: raw.results ?? [],
      pagination: {
        total: raw.total ?? 0,
        page: raw.page ?? 1,
        pageSize: raw.pageSize ?? 20,
      },
    };
  },

  getUserById: (id: number) => apiClient<{ user: DeanUser }>(`${BASE}/users/${id}`),

  updateUser: (id: number, data: Partial<Pick<DeanUser, 'full_name' | 'phone' | 'status'>>) =>
    apiClient<{ user: DeanUser }>(`${BASE}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  removeUser: (id: number) =>
    apiClient<{ message: string }>(`${BASE}/users/${id}`, { method: 'DELETE' }),

  // Registrations
  getPendingRegistrations: () =>
    apiClient<{ registrations: DeanUser[] }>(`${BASE}/registrations/pending`),

  approveRegistration: (id: number) =>
    apiClient<{ user: DeanUser }>(`${BASE}/registrations/${id}/approve`, { method: 'PUT' }),

  rejectRegistration: (id: number) =>
    apiClient<{ user: DeanUser }>(`${BASE}/registrations/${id}/reject`, { method: 'PUT' }),

  // Student Section Assignment
  getStudentRegistrations: (studentId: number) =>
    apiClient<{ registrations: any[] }>(`${BASE}/users/${studentId}/registrations`),

  assignStudentToSection: (
    studentId: number,
    data: { batchSectionId: number; academicYearId: number; semesterId: number }
  ) =>
    apiClient<{ registration: any }>(`${BASE}/users/${studentId}/assign-section`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Batches
  getBatches: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ batches: DeanBatch[] }>(`${BASE}/batches${query}`);
  },

  getBatchById: (id: number) => apiClient<{ batch: DeanBatch }>(`${BASE}/batches/${id}`),

  createBatch: (data: {
    name: string;
    programId: number;
    academicYearId: number;
    semester_number?: number;
  }) =>
    apiClient<{ batch: DeanBatch }>(`${BASE}/batches`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateBatch: (
    id: number,
    data: Partial<{ name: string; semester_number: number; academicYearId: number }>
  ) =>
    apiClient<{ batch: DeanBatch }>(`${BASE}/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteBatch: (id: number) =>
    apiClient<{ message: string }>(`${BASE}/batches/${id}`, { method: 'DELETE' }),

  // Sections
  getBatchSections: (batchId: number) =>
    apiClient<{ sections: DeanSection[] }>(`${BASE}/batches/${batchId}/sections`),

  getSectionById: (id: number) => apiClient<{ section: any }>(`${BASE}/sections/${id}`),

  createSection: (batchId: number, data: { name: string }) =>
    apiClient<{ section: DeanSection }>(`${BASE}/batches/${batchId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateSection: (id: number, data: { name: string }) =>
    apiClient<{ section: DeanSection }>(`${BASE}/sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteSection: (id: number) =>
    apiClient<{ message: string }>(`${BASE}/sections/${id}`, { method: 'DELETE' }),

  // Teachers
  getTeachers: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ teachers: DeanUser[] }>(`${BASE}/teachers${query}`);
  },

  getUnassignedTeachers: () => apiClient<{ teachers: DeanUser[] }>(`${BASE}/teachers/unassigned`),

  getUnassignedSections: () =>
    apiClient<{ sections: DeanSection[] }>(`${BASE}/sections/unassigned`),

  // Courses
  getCourses: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ courses: Course[] }>(`${BASE}/courses${query}`);
  },

  getCourseById: (id: number) => apiClient<{ course: Course }>(`${BASE}/courses/${id}`),

  createCourse: (data: {
    name: string;
    code: string;
    departmentId: number;
    description?: string;
    credits?: number;
  }) =>
    apiClient<{ course: Course }>(`${BASE}/courses`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateCourse: (id: number, data: Partial<Course>) =>
    apiClient<{ course: Course }>(`${BASE}/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteCourse: (id: number) =>
    apiClient<{ message: string }>(`${BASE}/courses/${id}`, { method: 'DELETE' }),

  // Teacher ↔ Course Assignments
  assignTeacherToCourse: (courseId: number, teacherId: number) =>
    apiClient<{ assignment: TeacherAssigning }>(`${BASE}/courses/${courseId}/teachers`, {
      method: 'POST',
      body: JSON.stringify({ teacherId })
    }),

  removeTeacherFromCourse: (courseId: number, teacherId: number) =>
    apiClient<{ message: string }>(`${BASE}/courses/${courseId}/teachers/${teacherId}`, {
      method: 'DELETE'
    }),

  // Course Offerings (Course → Section + Semester)
  getOfferings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiClient<{ offerings: CourseOffering[] }>(`${BASE}/offerings${query}`);
  },

  createOffering: (data: {
    courseId: number;
    sectionId: number;
    semesterId: number;
    academicYearId: number;
  }) =>
    apiClient<{ offering: CourseOffering }>(`${BASE}/offerings`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  deleteOffering: (id: number) =>
    apiClient<{ message: string }>(`${BASE}/offerings/${id}`, { method: 'DELETE' })
};
