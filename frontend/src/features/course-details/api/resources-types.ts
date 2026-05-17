export interface Resource {
  id: number;
  title: string;
  description: string | null;
  type: 'SYLLABUS' | 'ASSIGNMENT' | 'LECTURE_NOTE' | 'OTHER';
  url: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  courseId: number;
  teacherId: number;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  teacher?: {
    id: number;
    full_name: string;
  };
}

export interface CreateResourceData {
  title: string;
  description?: string;
  type?: 'SYLLABUS' | 'ASSIGNMENT' | 'LECTURE_NOTE' | 'OTHER';
  url: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherId: number;
  is_draft?: boolean;
}

export interface UpdateResourceData {
  title?: string;
  description?: string;
  type?: 'SYLLABUS' | 'ASSIGNMENT' | 'LECTURE_NOTE' | 'OTHER';
  url?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_draft?: boolean;
}

export interface ResourceFilters {
  search?: string;
  type?: 'all' | 'SYLLABUS' | 'ASSIGNMENT' | 'LECTURE_NOTE' | 'OTHER';
  status?: 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
}
