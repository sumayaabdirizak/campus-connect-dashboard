'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, GraduationCap } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAttendanceSummary } from '../../api/attendance-queries';
import { useCourseAccessList } from '../../api/access-queries';
import { useStudentWork } from '../../api/student-profile-queries';

interface StudentContextRailProps {
  courseId: string;
  studentId: number;
  studentName: string;
}

/**
 * Compact side panel for the grading drawer (and other surfaces that focus on
 * a single student). Surfaces the things a teacher would otherwise open the
 * full profile drawer for:
 *
 *   - last seen (relative + absolute on hover)
 *   - attendance rate badge
 *   - average grade + missing/late counts
 *   - last 3 grades, newest first
 *
 * Hidden on mobile (`hidden lg:block`) — when the parent surface is
 * full-screen on a phone, this side panel would compete with the main
 * content. Use the full profile drawer there instead.
 */
export function StudentContextRail({ courseId, studentId, studentName }: StudentContextRailProps) {
  const { data: summary } = useAttendanceSummary(courseId);
  const { data: accessRows = [] } = useCourseAccessList(courseId);
  const { data: work, isLoading } = useStudentWork(courseId, studentId);

  const attendance = summary?.students.find((s) => s.studentId === studentId);
  const lastSeen = accessRows.find((r) => r.userId === studentId)?.lastSeenAt ?? null;
  const rate = attendance?.ratePct ?? null;
  const missingCount = work?.stats.missingCount ?? 0;
  const isAtRisk = (rate != null && rate < 60) || missingCount >= 3;

  const recent = (work?.submissions ?? [])
    .filter((s) => typeof s.grade === 'number')
    .slice(0, 3);

  return (
    <aside className='hidden lg:flex flex-col w-64 shrink-0 border rounded-lg p-3 space-y-3 bg-muted/10'>
      <div>
        <div className='flex items-center justify-between gap-2'>
          <p className='text-sm font-medium truncate'>{studentName}</p>
          {isAtRisk && (
            <Badge variant='destructive' className='gap-1 text-[10px]'>
              <AlertTriangle className='w-3 h-3' />
              At risk
            </Badge>
          )}
        </div>
        {lastSeen ? (
          <p className='inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-1'>
            <Clock className='w-3 h-3' />
            Last seen
            <span title={new Date(lastSeen).toLocaleString()}>
              {formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}
            </span>
          </p>
        ) : (
          <p className='text-[10px] text-muted-foreground mt-1'>Never opened the course</p>
        )}
      </div>

      <div className='grid grid-cols-2 gap-2'>
        <Stat
          label='Attendance'
          value={rate != null ? `${rate}%` : '—'}
          tone={rate == null ? undefined : rate >= 80 ? 'good' : rate < 60 ? 'bad' : undefined}
        />
        <Stat
          label='Avg grade'
          value={work?.stats.avgGrade != null ? `${work.stats.avgGrade}%` : '—'}
          tone={
            work?.stats.avgGrade == null
              ? undefined
              : work.stats.avgGrade >= 80
                ? 'good'
                : work.stats.avgGrade < 60
                  ? 'bad'
                  : undefined
          }
        />
        <Stat
          label='Missing'
          value={work?.stats.missingCount ?? '—'}
          tone={missingCount >= 3 ? 'bad' : undefined}
        />
        <Stat label='Late' value={work?.stats.lateCount ?? '—'} />
      </div>

      <div>
        <p className='text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1'>
          <GraduationCap className='w-3 h-3' />
          Recent grades
        </p>
        {isLoading ? (
          <div className='space-y-1'>
            <Skeleton className='h-5 w-full' />
            <Skeleton className='h-5 w-full' />
          </div>
        ) : recent.length === 0 ? (
          <p className='text-[11px] text-muted-foreground italic'>No graded work yet.</p>
        ) : (
          <ul className='space-y-1'>
            {recent.map((s) => {
              const a = work?.assignments.find((x) => x.id === s.assignmentId);
              const grade = s.grade ?? 0;
              return (
                <li
                  key={s.id}
                  className='flex items-center justify-between gap-2 text-[11px]'
                >
                  <span className='truncate' title={a?.title}>
                    {a?.title ?? `Assignment #${s.assignmentId}`}
                  </span>
                  <span className='flex items-center gap-1 shrink-0'>
                    <span className='text-muted-foreground'>
                      {format(new Date(s.submitted_at), 'MMM d')}
                    </span>
                    <Badge
                      variant={grade >= 80 ? 'default' : grade >= 60 ? 'outline' : 'destructive'}
                      className='text-[10px]'
                    >
                      {grade}%
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function Stat({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone?: 'good' | 'bad';
}) {
  const colour =
    tone === 'good'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'bad'
        ? 'text-destructive'
        : '';
  return (
    <div className='border rounded p-2'>
      <p className='text-[9px] uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className={`text-sm font-semibold ${colour}`}>{value}</p>
    </div>
  );
}
