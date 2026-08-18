'use client';

import { useState } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { AttemptGrader } from '../attempt-grader';
import { QuizLiveMonitor } from '../quiz-live-monitor';
import { QuizAnalyticsView } from '../quiz-analytics-view';
import { useQuizAttempts } from '@/lib/course-details/queries/quizzes-queries';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import type { Quiz, QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { AttemptsTable } from './attempts-table';
import { AttemptsToolbar } from './attempts-toolbar';
import {
  buildAttemptRows,
  downloadAttemptsCsv,
  filterAttemptRows,
  needsGrading,
  statusCounts,
  type StatusFilter,
} from './helpers';

export function TeacherAttemptsPanel({
  quiz,
  courseId,
  onBack,
}: {
  quiz: Quiz;
  courseId: string;
  onBack: () => void;
}) {
  const { data: attempts = [], isLoading } = useQuizAttempts(quiz.id);
  const { data: roster = [] } = useRoster(courseId);
  const [grading, setGrading] = useState<QuizAttempt | null>(null);
  const [tab, setTab] = useState<'attempts' | 'analytics'>('attempts');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const liveGrading = grading
    ? attempts.find((a) => a.id === grading.id) ?? grading
    : null;

  if (liveGrading) {
    return (
      <AttemptGrader
        attempt={liveGrading}
        courseOfferingId={courseId}
        quizId={quiz.id}
        onBack={() => setGrading(null)}
      />
    );
  }

  const allRows = buildAttemptRows(roster, attempts);
  const filteredRows = filterAttemptRows(allRows, statusFilter, search);
  const counts = statusCounts(allRows);
  const pendingCount = attempts.filter(needsGrading).length;
  const totalPoints = (quiz.questions ?? []).reduce((sum, q) => sum + q.points, 0);

  return (
    <div className='space-y-3'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back
      </Button>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 flex-wrap'>
          <h3 className='font-bold text-lg'>{quiz.title}</h3>
          {pendingCount > 0 && tab === 'attempts' ? (
            <Badge variant='destructive'>{pendingCount} need grading</Badge>
          ) : null}
        </div>
        <div className='flex items-center gap-2'>
          <SegmentedControl
            ariaLabel='Attempts or analytics view'
            value={tab}
            onChange={setTab}
            options={[
              { value: 'attempts', label: 'Attempts' },
              {
                value: 'analytics',
                label: (
                  <span className='inline-flex items-center gap-1'>
                    <BarChart3 className='w-3 h-3' />
                    Analytics
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>

      {tab === 'analytics' ? (
        <QuizAnalyticsView quizId={quiz.id} />
      ) : (
        <>
          <QuizLiveMonitor quizId={quiz.id} />
          <AttemptsToolbar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            counts={counts}
            search={search}
            onSearchChange={setSearch}
            onExport={() => downloadAttemptsCsv(quiz.title, allRows)}
          />
          <AttemptsTable
            isLoading={isLoading}
            rows={filteredRows}
            search={search}
            statusFilter={statusFilter}
            rosterEmpty={roster.length === 0}
            onGrade={setGrading}
            isOffline={quiz.mode === 'offline'}
            quizId={quiz.id}
            totalPoints={totalPoints}
          />
        </>
      )}
    </div>
  );
}
