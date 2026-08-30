import type { CoursePostSource } from '@/lib/course-details/types';

export interface CourseFeedProps {
  courseId: string;
  isStudent?: boolean;
}

export const SOURCE_LABEL: Record<CoursePostSource, string> = {
  MANUAL: '',
  SESSION: 'Session',
  ATTENDANCE: 'Attendance',
  DEAN: 'Dean',
  REGISTRATION: 'Registration'
};
