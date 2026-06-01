'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, Eye, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListSkeleton } from './_shared/list-skeleton';
import { useResourceAnalytics } from '../api/resources-queries';
import type { Resource } from '../api/resources-types';

interface ResourceAnalyticsPanelProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/// Formats a second count as "Xm Ys" (or "Ys" under a minute). Keeps the
/// teacher table compact while staying readable for short clips.
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${rem}s`;
}

/**
 * Teacher-facing watch analytics for one video/audio resource. Shows a
 * summary strip (viewers / completion / average) plus a per-student table
 * including students who haven't started — so the teacher can chase
 * non-watchers, not just see who's engaged.
 */
export function ResourceAnalyticsPanel({
  resource,
  open,
  onOpenChange
}: ResourceAnalyticsPanelProps) {
  // Only fetch while the sheet is open for a real resource.
  const { data, isLoading, isError } = useResourceAnalytics(
    resource?.id ?? 0,
    open && !!resource
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-2xl overflow-y-auto'>
        <SheetHeader>
          <SheetTitle className='truncate'>
            Watch analytics · {resource?.title ?? ''}
          </SheetTitle>
        </SheetHeader>

        <div className='space-y-4 py-4'>
          {isLoading && <ListSkeleton variant='card' count={3} />}
          {isError && (
            <p className='text-sm text-destructive'>Failed to load analytics.</p>
          )}

          {data && (
            <>
              {/* Summary strip */}
              <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                <SummaryStat
                  icon={Users}
                  label='Students'
                  value={String(data.summary.totalStudents)}
                />
                <SummaryStat
                  icon={Eye}
                  label='Watched'
                  value={`${data.summary.viewers}/${data.summary.totalStudents}`}
                />
                <SummaryStat
                  icon={CheckCircle2}
                  label='Completed'
                  value={`${data.summary.completedCount}/${data.summary.totalStudents}`}
                />
                <SummaryStat
                  icon={Clock}
                  label='Class avg'
                  value={`${data.summary.avgPercent}%`}
                />
              </div>

              {/* Per-student rows */}
              <div className='space-y-2'>
                {data.rows.length === 0 && (
                  <p className='text-sm text-muted-foreground'>
                    No students enrolled in this course yet.
                  </p>
                )}
                {data.rows.map((row) => (
                  <div
                    key={row.studentId}
                    className='border rounded-lg p-3 space-y-2'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <div className='min-w-0'>
                        <p className='text-sm font-medium truncate'>{row.fullName}</p>
                        <p className='text-xs text-muted-foreground'>{row.number}</p>
                      </div>
                      <div className='flex items-center gap-1.5 shrink-0'>
                        {row.completed ? (
                          <Badge className='gap-1 bg-emerald-600 hover:bg-emerald-600'>
                            <CheckCircle2 className='w-3 h-3' /> Completed
                          </Badge>
                        ) : row.started ? (
                          <Badge variant='outline'>In progress</Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='text-muted-foreground'
                          >
                            Not started
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Progress value={row.percent} className='h-2 flex-1' />
                      <span className='text-xs tabular-nums text-muted-foreground w-9 text-right'>
                        {row.percent}%
                      </span>
                    </div>
                    <div className='flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground'>
                      {/* Watch time accumulates across replays, so a re-watcher
                          can exceed the media length — clamp the display so it
                          never reads "8m of 6m". */}
                      <span>
                        Watched{' '}
                        {fmtDuration(
                          row.durationSeconds > 0
                            ? Math.min(row.watchedSeconds, row.durationSeconds)
                            : row.watchedSeconds
                        )}
                      </span>
                      {row.durationSeconds > 0 && (
                        <span>of {fmtDuration(row.durationSeconds)}</span>
                      )}
                      {row.viewCount > 0 && (
                        <span>
                          {row.viewCount} view{row.viewCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {row.lastViewedAt && (
                        <span>
                          Last watched{' '}
                          {format(new Date(row.lastViewedAt), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className='border rounded-lg p-3'>
      <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
        <Icon className='w-3.5 h-3.5' />
        {label}
      </div>
      <p className='text-lg font-semibold mt-1'>{value}</p>
    </div>
  );
}
