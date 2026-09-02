'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/features/ui/components/sheet';
import { Badge } from '@/features/ui/components/badge';
import { Mail, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RosterStudent } from '@/lib/course-details/services/roster-types';
import { useCourseAccessList } from '@/lib/course-details/queries/access-queries';
import { useStudentWork } from '@/lib/course-details/queries/student-profile-queries';
import { ACTIVE_MS, studentInitials } from '../course-roster/helpers';
import { AssignmentsSection } from './assignments-section';
import { QuizzesSection } from './quizzes-section';

interface StudentProfileDrawerProps {
  courseId: string;
  student: RosterStudent | null;
  onClose: () => void;
}

export function StudentProfileDrawer({ courseId, student, onClose }: StudentProfileDrawerProps) {
  const open = !!student;
  const { data: accessRows = [] } = useCourseAccessList(courseId);
  const { data: work, isLoading: workLoading } = useStudentWork(
    courseId,
    student?.id ?? null
  );

  const lastSeenAt = accessRows.find((r) => r.userId === student?.id)?.lastSeenAt ?? null;
  const missingCount = work?.stats.missingCount ?? 0;
  const isAtRisk = missingCount >= 3;
  const isActive =
    lastSeenAt != null && Date.now() - new Date(lastSeenAt).getTime() <= ACTIVE_MS;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className='w-full overflow-y-auto sm:max-w-2xl'>
        {!student ? null : (
          <>
            <SheetHeader className='space-y-0 border-b border-border/60 pb-4 text-left'>
              <div className='flex items-start gap-3'>
                <div
                  className='flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'
                  aria-hidden
                >
                  {studentInitials(student.full_name) || '?'}
                </div>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <SheetTitle className='text-lg font-semibold text-foreground'>
                      {student.full_name}
                    </SheetTitle>
                    {isAtRisk ? (
                      <Badge variant='destructive' className='gap-1'>
                        <AlertTriangle className='size-3' />
                        At risk
                      </Badge>
                    ) : null}
                  </div>
                  <p className='text-sm font-medium text-foreground'>{student.number}</p>
                  <a
                    href={`mailto:${student.email}`}
                    className='inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-foreground hover:underline dark:text-muted-foreground'
                  >
                    <Mail className='size-3.5 shrink-0' />
                    <span className='truncate'>{student.email}</span>
                  </a>
                </div>
              </div>

              <div className='mt-3 flex flex-wrap items-center gap-2'>
                {!lastSeenAt ? (
                  <span className='inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
                    Never seen
                  </span>
                ) : (
                  <>
                    <span
                      className='text-sm text-foreground'
                      title={new Date(lastSeenAt).toLocaleString()}
                    >
                      Last seen{' '}
                      {formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}
                    </span>
                    {isActive ? (
                      <span className='inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'>
                        Active
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </SheetHeader>

            <div className='space-y-6 py-5'>
              <AssignmentsSection work={work} loading={workLoading} />
              <QuizzesSection work={work} loading={workLoading} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
