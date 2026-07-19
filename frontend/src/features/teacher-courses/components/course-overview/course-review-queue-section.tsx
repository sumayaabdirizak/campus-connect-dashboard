'use client';

import { Button } from '@/components/ui/button';
import {
  FileText,
  FolderOpen,
  ClipboardList,
  Newspaper,
  ClipboardCheck
} from 'lucide-react';
import { StudentGradesCard } from '@/features/course-details/components/student-grades-card';
import { CoursePageShell } from '@/features/course-details/components/_shared/course-page-shell';
import { pastelForTab } from '@/lib/pastel';
import { cn } from '@/lib/utils';
import type { CourseTabId } from '@/features/course-details/config/course-tabs';

const QUICK_LINKS: {
  tab: CourseTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { tab: 'feed', label: 'Feed', icon: Newspaper },
  { tab: 'assignments', label: 'Assignments', icon: FileText },
  { tab: 'quizzes', label: 'Quizzes', icon: ClipboardCheck },
  { tab: 'resources', label: 'Resources', icon: FolderOpen }
];

interface CourseReviewQueueSectionProps {
  isStudent?: boolean;
  pendingTotal: number;
  resourcesCount: number;
  syllabusUrl?: string | null;
  courseId?: string;
  onOpenTab?: (tab: CourseTabId) => void;
}

export function CourseReviewQueueSection({
  isStudent,
  pendingTotal,
  resourcesCount,
  syllabusUrl,
  courseId,
  onOpenTab
}: CourseReviewQueueSectionProps) {
  return (
    <div className='flex flex-col gap-5 lg:col-span-2'>
      <CoursePageShell
        title={isStudent ? 'Action needed' : 'Review queue'}
        description={
          pendingTotal > 0
            ? `${pendingTotal} item${pendingTotal !== 1 ? 's' : ''} need${pendingTotal === 1 ? 's' : ''} your attention.`
            : isStudent
              ? 'You are up to date on assignments and quizzes.'
              : 'No submissions waiting for grading.'
        }
        actions={
          <span className='flex items-center gap-2'>
            {pendingTotal > 0 && (
              <span className='inline-flex min-w-[22px] items-center justify-center rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-pink-700 dark:bg-pink-500/20 dark:text-pink-300'>
                {pendingTotal}
              </span>
            )}
            {!isStudent && (
              <Button
                variant='outline'
                size='sm'
                className='gap-1.5'
                onClick={() => onOpenTab?.('reviews')}
              >
                <ClipboardList className='size-4' />
                View all
              </Button>
            )}
          </span>
        }
      >
        <div className='flex min-w-0 flex-wrap gap-2'>
          {QUICK_LINKS.map(({ tab, label, icon: Icon }) => {
            const hue = pastelForTab(tab);
            return (
              <button
                key={tab}
                type='button'
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all hover:shadow-sm hover:brightness-[0.97] sm:h-9 sm:gap-2 sm:px-3.5 sm:text-sm dark:hover:brightness-110',
                  hue.chip
                )}
                onClick={() => onOpenTab?.(tab)}
              >
                <Icon className='size-4' />
                {label}
                {tab === 'resources' && resourcesCount > 0 && (
                  <span className='opacity-70'>({resourcesCount})</span>
                )}
              </button>
            );
          })}
          {syllabusUrl && (
            <Button
              variant='outline'
              size='sm'
              className='h-9 gap-2'
              onClick={() => window.open(syllabusUrl, '_blank', 'noopener,noreferrer')}
            >
              <FileText className='size-4' />
              Syllabus
            </Button>
          )}
        </div>
      </CoursePageShell>

      {isStudent && courseId && <StudentGradesCard courseId={courseId} />}
    </div>
  );
}
