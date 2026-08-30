'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { AttemptReview } from '../attempt-review';
import { StudentAttempt } from '../student-quiz-attempt';
import { EmptyState } from '../../_shared/empty-state';
import { ListSkeleton } from '../../_shared/list-skeleton';
import { useQueryClient } from '@/lib/async-query';
import { getAttemptReview } from '@/lib/course-details/services/quizzes-service';
import { quizKeys, useAvailableQuizzes, useStartQuiz } from '@/lib/course-details/queries/quizzes-queries';
import { toast } from 'sonner';
import type { QuizAttempt, QuizStartResponse } from '@/lib/course-details/services/quizzes-types';
import { StudentQuizList } from './student-quiz-list';
import { SubmitSuccessOverlay } from './submit-success-overlay';
import { TimeoutAlert } from './timeout-alert';
import { CourseTabHeader } from '../../_shared/course-tab-header';
import { CourseTabPage } from '../../_shared/course-tab-page';

export function StudentView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useAvailableQuizzes(courseId, { live: true });
  const queryClient = useQueryClient();
  const startMutation = useStartQuiz();
  const [attempt, setAttempt] = useState<QuizStartResponse | null>(null);
  const [review, setReview] = useState<QuizAttempt | null>(null);
  const [submittedAnim, setSubmittedAnim] = useState<QuizAttempt | null>(null);
  const [timedOutAttempt, setTimedOutAttempt] = useState<QuizAttempt | null>(null);
  const [reviewLoadingId, setReviewLoadingId] = useState<number | null>(null);

  const openResults = async (attemptId: number) => {
    setReviewLoadingId(attemptId);
    try {
      setReview(await getAttemptReview(attemptId));
    } catch (e) {
      const msg =
        e instanceof TypeError && e.message === 'Failed to fetch'
          ? 'Cannot reach the server. Start the backend and try again.'
          : e instanceof Error
            ? e.message
            : 'Could not load your results';
      toast.error(msg);
    } finally {
      setReviewLoadingId(null);
    }
  };

  if (review) {
    return (
      <>
        <AttemptReview
          attempt={review}
          onBack={() => {
            setReview(null);
            setAttempt(null);
          }}
        />
        <TimeoutAlert
          timedOutAttempt={timedOutAttempt}
          onClose={() => setTimedOutAttempt(null)}
        />
      </>
    );
  }

  if (attempt) {
    return (
      <div className='space-y-3'>
        <StudentAttempt
          data={attempt}
          onBack={() => {
            setAttempt(null);
            queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
          }}
          onSubmitted={(finalized) => {
            setSubmittedAnim(finalized);
            setTimeout(() => {
              setAttempt(null);
              setSubmittedAnim(null);
              setReview(finalized);
              queryClient.invalidateQueries({ queryKey: quizKeys.available(courseId) });
              if (finalized.closure_reason === 'time_expired') {
                setTimedOutAttempt(finalized);
              }
            }, 1400);
          }}
        />
        {submittedAnim ? <SubmitSuccessOverlay attempt={submittedAnim} /> : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Quizzes'
          description='Take available quizzes and review your results.'
        />
        <ListSkeleton variant='row' count={2} />
      </CourseTabPage>
    );
  }
  if (quizzes.length === 0) {
    return (
      <CourseTabPage>
        <CourseTabHeader
          title='Quizzes'
          description='Take available quizzes and review your results.'
        />
        <EmptyState
          icon={ClipboardList}
          title='No quizzes available'
          description='When your teacher opens a quiz, it will show up here.'
        />
      </CourseTabPage>
    );
  }

  return (
    <CourseTabPage>
      <CourseTabHeader
        title='Quizzes'
        description='Take available quizzes and review your results.'
      />
      <StudentQuizList
        quizzes={quizzes}
        reviewLoadingId={reviewLoadingId}
        startPending={startMutation.isPending}
        onOpenResults={openResults}
        onStart={(quizId) =>
          startMutation.mutate(quizId, {
            onSuccess: (data) => setAttempt(data),
            onError: (e: Error) => toast.error(e.message),
          })
        }
      />
    </CourseTabPage>
  );
}
