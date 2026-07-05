'use client';

import { useMemo } from 'react';
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
import { courseColor } from '@/features/student-courses/lib/course-color';
import type { CourseTabId } from '@/features/course-details/config/course-tabs';

interface ScheduleRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string;
  topic?: string | null;
}

interface ToReviewItem {
  id: number;
  type: 'assignment' | 'quiz';
  title: string;
  pendingCount: number;
  status: string;
  dueAt?: string | null;
  openAt?: string | null;
}

interface OverviewData {
  schedules?: ScheduleRow[];
  toReview?: ToReviewItem[];
  section?: { name: string; _count?: { studentRegistrations: number } };
  quickLinks?: {
    syllabus?: {
      id: number;
      title: string;
      url: string;
      type: string;
    } | null;
    resourcesCount?: number;
  };
  course?: { code: string };
}

interface CourseOverviewProps {
  data: OverviewData | null;
  isStudent?: boolean;
  onOpenTab?: (tab: CourseTabId) => void;
  courseCode?: string;
  courseId?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 5);
}

export function CourseOverview({
  data,
  isStudent,
  onOpenTab,
  courseCode,
  courseId
}: CourseOverviewProps) {
  const schedules = data?.schedules ?? [];
  const toReview = data?.toReview ?? [];
  const syllabus = data?.quickLinks?.syllabus ?? null;
  const resourcesCount = data?.quickLinks?.resourcesCount ?? 0;

  const pendingTotal = useMemo(
    () =>
      toReview
        .filter((t) => t.status !== 'Draft')
        .reduce((sum, i) => sum + i.pendingCount, 0),
    [toReview]
  );

  const accentColor = courseCode ? courseColor(courseCode) : 'hsl(var(--primary))';

  return (
    <div className='flex min-w-0 max-w-full flex-col gap-4 sm:gap-5'>
      <div className='grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3'>
        <CoursePageShell
          title='Weekly schedule'
          description='Class times and locations for this offering.'
          className='lg:col-span-1'
          flush
        >
          {schedules.length === 0 ? (
            <p className='px-4 py-8 text-center text-sm text-muted-foreground sm:px-6'>
              No classes scheduled yet.
            </p>
          ) : (
            <ul className='divide-y divide-border/60' role='list'>
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className='flex items-center gap-3 px-4 py-3 sm:px-6'
                >
                  <span
                    className='flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold'
                    style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                  >
                    {DAY_NAMES[s.day_of_week]}
                  </span>
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-medium'>
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {s.location || 'Location TBD'}
                      {s.topic ? ` · ${s.topic}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CoursePageShell>

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
              !isStudent ? (
                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={() => onOpenTab?.('reviews')}
                >
                  <ClipboardList className='size-4' />
                  View all
                </Button>
              ) : undefined
            }
          >
            <div className='flex min-w-0 flex-wrap gap-2'>
              {QUICK_LINKS.map(({ tab, label, icon: Icon }) => (
                <Button
                  key={tab}
                  variant='secondary'
                  size='sm'
                  className='h-8 shrink-0 gap-1.5 px-2.5 text-xs sm:h-9 sm:gap-2 sm:px-3 sm:text-sm'
                  onClick={() => onOpenTab?.(tab)}
                >
                  <Icon className='size-4' />
                  {label}
                  {tab === 'resources' && resourcesCount > 0 && (
                    <span className='text-muted-foreground'>({resourcesCount})</span>
                  )}
                </Button>
              ))}
              {syllabus?.url && (
                <Button
                  variant='outline'
                  size='sm'
                  className='h-9 gap-2'
                  onClick={() => window.open(syllabus.url, '_blank', 'noopener,noreferrer')}
                >
                  <FileText className='size-4' />
                  Syllabus
                </Button>
              )}
            </div>
          </CoursePageShell>

          {isStudent && courseId && <StudentGradesCard courseId={courseId} />}
        </div>
      </div>
    </div>
  );
}
