export interface StudentCourse {
  id: string;
  courseCode: string;
  courseName: string;
  department: string;
  section: string;
  thumbnail: string | null;
  instructor: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  schedule?: { day: number; time: string }[];
  nextClass?: {
    day: string;
    time: string;
    location: string;
  };
  status: 'active' | 'completed';
  enrolledAt: string;
}

export interface StudentCourseFilters {
  status?: 'all' | 'active' | 'completed';
  search?: string;
}

export interface SemesterHistoryCourse {
  code: string;
  name: string;
  credits: number;
}

export interface SemesterHistoryEntry {
  semesterId: number;
  semesterName: string;
  academicYearName: string;
  sequence: number;
  courses: SemesterHistoryCourse[];
}
