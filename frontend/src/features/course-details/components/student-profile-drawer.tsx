'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Clock, AlertTriangle, CheckCircle2, BookOpen, ClipboardList } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { RosterStudent } from '../api/roster-types';
import { useCourseAccessList } from '../api/access-queries';
import { useStudentWork } from '../api/student-profile-queries';

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

            <section className='space-y-3'>
              <h3 className='text-sm font-medium flex items-center gap-2'>
                <ClipboardList className='w-4 h-4' /> Assignments
              </h3>
              {workLoading ? (
                <Skeleton className='h-24 w-full' />
              ) : !work ? (
                <p className='text-sm text-muted-foreground'>—</p>
              ) : (
                <>
                  <div className='grid grid-cols-4 gap-2'>
                    <Stat
                      label='Avg grade'
                      value={work.stats.avgGrade != null ? `${work.stats.avgGrade}%` : '—'}
                      tone={work.stats.avgGrade != null ? rateTone(work.stats.avgGrade) : undefined}
                    />
                    <Stat label='Submitted' value={`${work.stats.submittedCount}/${work.stats.totalAssignments}`} />
                    <Stat label='Missing' value={work.stats.missingCount} tone={work.stats.missingCount >= 3 ? 'destructive' : undefined} />
                    <Stat label='Late' value={work.stats.lateCount} />
                  </div>
                  {work.submissions.length === 0 ? (
                    <p className='text-xs text-muted-foreground italic'>No submissions yet.</p>
                  ) : (
                    <ul className='space-y-1 max-h-48 overflow-y-auto'>
                      {work.submissions.map((s) => {
                        const a = work.assignments.find((x) => x.id === s.assignmentId);
                        return (
                          <li
                            key={s.id}
                            className='flex items-center justify-between gap-2 text-xs border rounded px-2 py-1'
                          >
                            <span className='truncate'>{a?.title ?? `#${s.assignmentId}`}</span>
                            <span className='flex items-center gap-2 shrink-0'>
                              <span className='text-muted-foreground'>
                                {format(new Date(s.submitted_at), 'MMM d')}
                              </span>
                              {s.is_late && (
                                <Badge variant='outline' className='text-[10px]'>
                                  Late
                                </Badge>
                              )}
                              <Badge
                                variant={
                                  s.grade == null
                                    ? 'secondary'
                                    : s.grade >= 80
                                      ? 'default'
                                      : s.grade >= 60
                                        ? 'outline'
                                        : 'destructive'
                                }
                              >
                                {s.grade != null ? `${s.grade}%` : 'Ungraded'}
                              </Badge>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </section>

            <section className='space-y-3'>
              <h3 className='text-sm font-medium flex items-center gap-2'>
                <BookOpen className='w-4 h-4' /> Quizzes
              </h3>
              {workLoading ? (
                <Skeleton className='h-16 w-full' />
              ) : !work || work.quizAttempts.length === 0 ? (
                <p className='text-xs text-muted-foreground italic'>No attempts yet.</p>
              ) : (
                <ul className='space-y-1 max-h-40 overflow-y-auto'>
                  {work.quizAttempts.map((a) => {
                    const passed =
                      a.score != null && a.score >= a.quiz.passing_score;
                    return (
                      <li
                        key={a.id}
                        className='flex items-center justify-between text-xs border rounded px-2 py-1'
                      >
                        <span className='flex items-center gap-1 truncate'>
                          {passed && <CheckCircle2 className='w-3 h-3 text-emerald-600 dark:text-emerald-400' />}
                          {a.quiz.title}
                        </span>
                        <span className='flex items-center gap-2 shrink-0'>
                          {a.submitted_at && (
                            <span className='text-muted-foreground'>
                              {format(new Date(a.submitted_at), 'MMM d')}
                            </span>
                          )}
                          <Badge
                            variant={
                              a.score == null
                                ? 'secondary'
                                : passed
                                  ? 'default'
                                  : 'destructive'
                            }
                          >
                            {a.score != null ? `${Math.round(a.score)}%` : '—'}
                          </Badge>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function rateTone(pct: number): 'emerald' | undefined | 'destructive' {
  if (pct >= 80) return 'emerald';
  if (pct < 60) return 'destructive';
  return undefined;
}

function Stat({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone?: 'emerald' | 'destructive';
}) {
  const colour =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'destructive'
        ? 'text-destructive'
        : '';
  return (
    <div className='border rounded p-2'>
      <p className='text-[10px] uppercase text-muted-foreground tracking-wide'>{label}</p>
      <p className={`text-lg font-semibold ${colour}`}>{value}</p>
    </div>
  );
}
