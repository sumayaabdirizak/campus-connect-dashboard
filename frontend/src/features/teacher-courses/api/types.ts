export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
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

/** One pending-work row on the course overview ("To Review" / "Pending Tasks"). */
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

/**
 * Response of GET /lecturer-portal/courses/:offeringId and
 * GET /student-portal/courses/:offeringId — both portals serialize the same
 * shape (see backend teacherCourse.controller.js / studentPortal.controller.js).
 */
export interface CourseOfferingDetail {
  /** Offering publicId (UUID) — never the numeric row id. */
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
  /** Class schedules were removed from the data model — always empty. */
  schedules: never[];
  toReview: CourseDetailToReviewItem[];
  quickLinks: CourseDetailQuickLinks;
}
