import type { CoursePostSource } from '@/lib/course-details/types';

export interface CourseFeedProps {
  courseId: string;
  isStudent?: boolean;
}

export type FeedFilter = 'all' | 'important' | 'attachments' | 'auto';

export const SOURCE_LABEL: Record<CoursePostSource, string> = {
  MANUAL: '',
  SESSION: 'Session',
  ATTENDANCE: 'Attendance',
  DEAN: 'Dean',
  REGISTRATION: 'Registration'
};

export const REACTION_PALETTE = ['👍', '❤️', '🎉', '🤔', '😮', '👏'];
