'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AttemptGrader } from '../attempt-grader';
import { useQuizAttempts, useQuizzes } from '@/lib/course-details/queries/quizzes-queries';
import { useRoster } from '@/lib/course-details/queries/roster-queries';
import type { Quiz, QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { resolveQuizTotalPoints } from '@/lib/course-details/services/quiz-total-points';
import { getQuizWindowState } from '../teacher-quiz-card/quiz-window-state';
import { AttemptsTable } from './attempts-table';
import { buildAttemptRows, needsGrading } from './helpers';

export function TeacherAttemptsPanel({
  quiz,
  courseId,
  onBack
}: {
  quiz: Quiz;
  courseId: string;
  onBack: () => void;
}) {
  const { data: attempts = [], isLoading } = useQuizAttempts(quiz.id, { live: true });
  const { data: quizzes = [] } = useQuizzes(courseId, { live: true });
  const { data: roster = [] } = useRoster(courseId, { live: true });
  const [grading, setGrading] = useState<QuizAttempt | null>(null);

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
  const pendingCount = attempts.filter(needsGrading).length;
  const liveQuiz = quizzes.find((q) => q.id === quiz.id) ?? quiz;
  const totalPoints = resolveQuizTotalPoints(liveQuiz);
  const quizClosed = getQuizWindowState(liveQuiz) === 'closed';

  return (
    <div className='space-y-4'>
      <div className='flex min-w-0 items-center gap-3'>
        <Button
          variant='ghost'
          onClick={onBack}
          className='shrink-0 gap-1 pl-0 hover:bg-transparent'
        >
          <ArrowLeft className='size-4' /> Back to table
        </Button>
        <span className='hidden h-5 w-px shrink-0 bg-border sm:block' aria-hidden />
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <h2 className='min-w-0 truncate text-lg font-semibold tracking-tight text-foreground'>
            {quiz.title}
          </h2>
          {pendingCount > 0 ? (
            <Badge variant='destructive' className='rounded-full'>
              {pendingCount} need grading
            </Badge>
          ) : null}
        </div>
      </div>

      <AttemptsTable
        isLoading={isLoading}
        allRows={allRows}
        rosterEmpty={roster.length === 0}
        onGrade={setGrading}
        isOffline={quiz.mode === 'offline'}
        quizId={quiz.id}
        quizTitle={quiz.title}
        totalPoints={totalPoints}
        quizClosed={quizClosed}
      />
    </div>
  );
}
