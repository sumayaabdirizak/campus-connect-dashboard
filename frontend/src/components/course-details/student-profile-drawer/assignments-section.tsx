import { Badge } from '@/features/ui/components/badge';
import { Skeleton } from '@/features/ui/components/skeleton';
import { ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import type { StudentWork } from '@/lib/course-details/services/student-profile-types';
import { rateTone, Stat } from './stat';

export function AssignmentsSection({
  work,
  loading
}: {
  work: StudentWork | undefined;
  loading: boolean;
}) {
  return (
    <section className='space-y-3'>
      <h3 className='text-sm font-medium flex items-center gap-2'>
        <ClipboardList className='w-4 h-4' /> Assignments
      </h3>
      {loading ? (
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
            <Stat
              label='Submitted'
              value={`${work.stats.submittedCount}/${work.stats.totalAssignments}`}
            />
            <Stat
              label='Missing'
              value={work.stats.missingCount}
              tone={work.stats.missingCount >= 3 ? 'destructive' : undefined}
            />
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
  );
}
