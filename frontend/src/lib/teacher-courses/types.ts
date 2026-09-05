export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  batch?: string | null;
  section: string;
  thumbnail: string | null;
  totalStudents: number;
  totalLessons: number;
  pendingSubmissions?: number;
  drafts?: number;
  schedule?: {
    day: string;
    time: string;
    location: string;
  };
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
}

export interface CourseFilters {
  status?: 'all' | 'active' | 'completed';
  search?: string;
}

export interface CourseDetailToReviewItem {
  id: number;
  type: 'assignment' | 'quiz';
  title: string;
  pendingCount: number;
  status: string;
  dueAt: string | null;
  openAt: string | null;
}

export interface CourseDetailQuickLinks {
  syllabus: { id: number; title: string; url: string; type: string } | null;
  resourcesCount: number;
}

export interface CourseOfferingDetail {
  id: string;
  course: {
    id: number;
    name: string;
    code: string;
    description: string | null;
    credits: number;
    thumbnail: string | null;
    department: { id: number; name: string };
  };
  section: {
    id: number;
    name: string;
    batch: { id: number; name: string };
    _count: { studentRegistrations: number };
  };
  batch: { id: number; name: string };
  schedules: never[];
  toReview: CourseDetailToReviewItem[];
  quickLinks: CourseDetailQuickLinks;
}
