'use client'

import type { ReviewQueueItem } from '@/lib/course-details/queries/question-bank-queries';
import type { CourseTabId } from '@/lib/course-details/queries/types';

export interface CourseReviewsProps {
  items: ReviewQueueItem[];
  isStudent: boolean;
  onOpenTab: (tab: CourseTabId) => void;
}

export function Coursereviews({ items, isStudent, onOpenTab }: CourseReviewsProps) {
  return <div className="p-4">Coursereviews</div>
}

export default Coursereviews
