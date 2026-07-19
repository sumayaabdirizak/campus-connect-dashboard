'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { RosterStudent } from '../../api/roster-types';
import { useCourseAccessList } from '../../api/access-queries';
import { useStudentWork } from '../../api/student-profile-queries';
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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className='w-full sm:max-w-2xl overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>{student?.full_name ?? 'Student'}</SheetTitle>
        </SheetHeader>

        {!student ? null : (
          <div className='space-y-6 py-4'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-2 flex-wrap'>
                <div>
                  <p className='text-sm text-muted-foreground'>{student.number}</p>
                  <a
                    href={`mailto:${student.email}`}
                    className='inline-flex items-center gap-1 text-sm hover:underline'
                  >
                    <Mail className='w-3.5 h-3.5' /> {student.email}
                  </a>
                </div>
                {isAtRisk && (
                  <Badge variant='destructive' className='gap-1'>
                    <AlertTriangle className='w-3 h-3' /> At risk
                  </Badge>
                )}
              </div>
              {lastSeenAt && (
                <p className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
                  <Clock className='w-3 h-3' />
                  Last seen{' '}
                  <span title={new Date(lastSeenAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(lastSeenAt), { addSuffix: true })}
                  </span>
                </p>
              )}
            </div>

            <AssignmentsSection work={work} loading={workLoading} />
            <QuizzesSection work={work} loading={workLoading} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
