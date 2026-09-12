import { Skeleton } from '@/features/ui/components/skeleton';
import { ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import type {
  StudentWork,
  StudentWorkAssignment,
  StudentWorkSubmission
} from '@/lib/course-details/services/student-profile-types';
import { EmptyState } from '../_shared/empty-state';
import {
  fmtPoints,
  fmtScoreFromPct,
  MAX_COURSE_MARK
} from '../course-gradebook/gradebook-math';
import { formatLateBy } from '../assignments/student-assignment-card/helpers';
import { WorkTable, WorkTableCell, WorkTableRow } from './work-table';

function assignmentCloseAtMs(a: StudentWorkAssignment): number {
  const due = new Date(a.due_date).getTime();
  const minutes = a.lateWindowMinutes ?? 0;
  if (minutes < 0) return Number.MAX_SAFE_INTEGER;
  return due + minutes * 60_000;
}

function assignmentStatus(
  assignment: StudentWorkAssignment,
  submission: StudentWorkSubmission | undefined
): { label: string; className: string } {
  if (submission) {
    if (submission.is_late) {
      const lateBy = formatLateBy(submission.submitted_at, assignment.due_date);
      return {
        label: lateBy ?? 'Late',
        className: 'font-medium text-amber-700 dark:text-amber-400'
      };
    }
    return { label: 'Submitted', className: 'text-foreground' };
  }
  if (assignmentCloseAtMs(assignment) < Date.now()) {
    return { label: 'Missing', className: 'font-medium text-destructive' };
  }
  return { label: 'Not submitted', className: 'text-[#667085] dark:text-muted-foreground' };
}

export function AssignmentsSection({
  work,
  loading
}: {
  work: StudentWork | undefined;
  loading: boolean;
}) {
  return (
    <section className='space-y-3'>
      <h3 className='flex items-center gap-2 text-sm font-semibold text-foreground'>
        <ClipboardList className='size-4 text-[#667085] dark:text-muted-foreground' />
        Assignments
      </h3>
      {loading ? (
        <Skeleton className='h-32 w-full rounded-lg' />
      ) : !work ? (
        <p className='text-sm text-[#667085] dark:text-muted-foreground'>Could not load work.</p>
      ) : work.assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title='No assignments published'
          description='Published assignments for this course will appear here.'
          className='p-6'
        />
      ) : (
        <>
          <p className='text-sm text-foreground'>
            <span className='font-medium tabular-nums'>
              {work.stats.submittedCount}/{work.stats.totalAssignments}
            </span>
            <span className='text-[#667085] dark:text-muted-foreground'> submitted</span>
            {work.stats.missingCount > 0 ? (
              <>
                <span className='text-[#667085] dark:text-muted-foreground'> · </span>
                <span className='font-medium tabular-nums text-destructive'>
                  {work.stats.missingCount}
                </span>
                <span className='text-destructive'> missing</span>
              </>
            ) : null}
            <span className='text-[#667085] dark:text-muted-foreground'> · avg </span>
            <span className='font-medium tabular-nums'>
              {fmtScoreFromPct(work.stats.avgGrade)}
            </span>
          </p>

          <WorkTable headers={['Assignment', 'Status', 'Grade']}>
            {work.assignments.map((assignment) => {
              const submission = work.submissions.find((s) => s.assignmentId === assignment.id);
              const status = assignmentStatus(assignment, submission);
              const maxMarks = Math.min(assignment.maxMarks ?? MAX_COURSE_MARK, MAX_COURSE_MARK);
              const grade =
                submission?.grade != null ? Math.min(submission.grade, maxMarks) : null;

              return (
                <WorkTableRow key={assignment.id}>
                  <WorkTableCell className='max-w-[200px]'>
                    <p className='truncate font-medium text-foreground'>{assignment.title}</p>
                    {submission ? (
                      <p className='text-xs text-[#667085] dark:text-muted-foreground'>
                        {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                      </p>
                    ) : (
                      <p className='text-xs text-[#667085] dark:text-muted-foreground'>
                        Due {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </WorkTableCell>
                  <WorkTableCell>
                    <span className={status.className}>{status.label}</span>
                  </WorkTableCell>
                  <WorkTableCell align='right'>
                    <span className='font-medium tabular-nums text-foreground'>
                      {grade != null ? fmtPoints(grade, maxMarks) : '—'}
                    </span>
                  </WorkTableCell>
                </WorkTableRow>
              );
            })}
          </WorkTable>
        </>
      )}
    </section>
  );
}
