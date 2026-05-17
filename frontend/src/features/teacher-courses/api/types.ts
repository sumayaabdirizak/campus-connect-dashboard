export interface Course {
  id: number;
  courseCode: string;
  courseName: string;
  department: string;
  section: string;
  thumbnail: string | null;
  totalStudents: number;
  totalLessons: number;
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
