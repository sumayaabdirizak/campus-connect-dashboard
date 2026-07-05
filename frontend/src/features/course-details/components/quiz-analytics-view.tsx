'use client';

import { useState } from 'react';
import { BarChart3, Check, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuizAnalytics } from '../api/quizzes-queries';
import { EmptyState } from './_shared/empty-state';
import { ListSkeleton } from './_shared/list-skeleton';

export function QuizAnalyticsView({ quizId }: { quizId: number }) {
  const { data, isLoading } = useQuizAnalytics(quizId);
  const [sortBy, setSortBy] = useState<'order' | 'hardest'>('order');

  if (isLoading || !data) return <ListSkeleton variant='row' count={3} />;

  if (data.totalSubmissions === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title='No data yet'
        description='Analytics appear once at least one student submits an attempt.'
      />
    );
  }

  const sorted =
    sortBy === 'hardest'
      ? [...data.questions].sort((a, b) => {
          const av = a.correctRate ?? 1000;
          const bv = b.correctRate ?? 1000;
          return av - bv;
        })
      : [...data.questions].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className='space-y-3'>
      <div className='border rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap'>
        <div className='flex items-center gap-4'>
          <div>
            <p className='text-[11px] text-muted-foreground uppercase tracking-wide'>
              Submissions
            </p>
            <p className='text-lg font-semibold tabular-nums'>{data.totalSubmissions}</p>
          </div>
          <div>
            <p className='text-[11px] text-muted-foreground uppercase tracking-wide'>
              Avg score
            </p>
            <p className='text-lg font-semibold tabular-nums'>
              {data.avgScore != null ? `${data.avgScore}%` : '—'}
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='gap-1'
          onClick={() => setSortBy(sortBy === 'order' ? 'hardest' : 'order')}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              sortBy === 'hardest' ? 'rotate-180' : ''
            }`}
          />
          {sortBy === 'hardest' ? 'Hardest first' : 'In order'}
        </Button>
      </div>

      <div className='space-y-2'>
        {sorted.map((q, i) => {
          const rate = q.correctRate;
          const bar =
            rate == null
              ? 'bg-muted'
              : rate >= 80
                ? 'bg-success'
                : rate >= 50
                  ? 'bg-warning'
                  : 'bg-destructive';
          return (
            <details
              key={q.id}
              className='border rounded-xl p-3 group'
              {...(rate != null && rate < 50 ? { open: true } : {})}
            >
              <summary className='list-none cursor-pointer space-y-2'>
                <div className='flex items-start justify-between gap-3'>
                  <p className='text-sm font-medium leading-snug'>
                    <span className='text-muted-foreground tabular-nums mr-1'>
                      {sortBy === 'order' ? q.order_index + 1 : i + 1}.
                    </span>
                    {q.question_text}
                  </p>
                  <div className='shrink-0 flex items-center gap-2'>
                    {rate != null ? (
                      <Badge
                        variant='outline'
                        className={`tabular-nums text-[10px] ${
                          rate >= 80
                            ? 'text-success border-success'
                            : rate >= 50
                              ? 'text-warning border-warning'
                              : 'text-destructive border-destructive/40'
                        }`}
                      >
                        {rate}% correct
                      </Badge>
                    ) : (
                      <Badge variant='outline' className='text-[10px] text-muted-foreground'>
                        Ungraded
                      </Badge>
                    )}
                    {q.pending > 0 && (
                      <Badge variant='secondary' className='text-[10px] tabular-nums'>
                        {q.pending} pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className='h-1.5 rounded-full overflow-hidden bg-muted'>
                  <div
                    className={`h-full transition-all duration-300 ${bar}`}
                    style={{ width: `${rate ?? 0}%` }}
                    aria-hidden
                  />
                </div>
                <p className='text-[11px] text-muted-foreground tabular-nums'>
                  {q.correctCount}/{Math.max(q.totalAnswered - q.pending, 0)} correct ·{' '}
                  {q.totalAnswered} answered
                </p>
              </summary>
              {q.optionStats && q.optionStats.length > 0 && (
                <div className='mt-3 pt-3 border-t space-y-1.5'>
                  {q.optionStats.map((o, optIdx) => {
                    const isMostPicked =
                      q.optionStats &&
                      o.pickedCount > 0 &&
                      Math.max(...q.optionStats.map((s) => s.pickedCount)) ===
                        o.pickedCount;
                    return (
                      <div key={o.optionId} className='space-y-1'>
                        <div className='flex items-center justify-between text-xs gap-2'>
                          <div className='flex items-center gap-2 min-w-0'>
                            <span className='text-[10px] font-medium text-muted-foreground tabular-nums w-4 shrink-0'>
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span
                              className={`truncate ${o.is_correct ? 'font-medium' : ''}`}
                            >
                              {o.option_text}
                            </span>
                            {o.is_correct && (
                              <Check className='w-3 h-3 text-success shrink-0' />
                            )}
                            {isMostPicked && !o.is_correct && (
                              <Badge
                                variant='outline'
                                className='text-[9px] text-destructive border-destructive/40 shrink-0'
                              >
                                Most-picked wrong
                              </Badge>
                            )}
                          </div>
                          <span className='tabular-nums text-muted-foreground shrink-0'>
                            {o.pickedPct}% ({o.pickedCount})
                          </span>
                        </div>
                        <div className='h-1 rounded-full overflow-hidden bg-muted'>
                          <div
                            className={`h-full transition-all ${
                              o.is_correct ? 'bg-success' : 'bg-muted-foreground/40'
                            }`}
                            style={{ width: `${o.pickedPct}%` }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}
