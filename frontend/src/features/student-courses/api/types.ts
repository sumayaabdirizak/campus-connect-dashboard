export interface StudentCourse {
  id: number;
  courseCode: string;
  courseName: string;
  department: string;
  section: string;
  thumbnail: string | null;
  instructor: {
    id: number;
    name: string;
  };
  totalLessons: number;
  completedLessons: number;
  progress: number;
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
