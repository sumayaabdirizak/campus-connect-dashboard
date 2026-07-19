'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { AttemptReview } from '../attempt-review';
import { StudentAttempt } from '../student-quiz-attempt';
import { EmptyState } from '../_shared/empty-state';
import { ListSkeleton } from '../_shared/list-skeleton';
import { groupQuizzesByModule } from '../course-quizzes-utils';
import { useQueryClient } from '@/lib/async-query';
import { getAttemptReview } from '../../api/quizzes-service';
import { quizKeys, useAvailableQuizzes, useStartQuiz } from '../../api/quizzes-queries';
import { useModules } from '../../api/resources-queries';
import { toast } from 'sonner';
import type { QuizAttempt, QuizStartResponse } from '../../api/quizzes-types';
import { StudentQuizList } from './student-quiz-list';
import { SubmitSuccessOverlay } from './submit-success-overlay';
import { TimeoutAlert } from './timeout-alert';

export function StudentView({ courseId }: { courseId: string }) {
  const { data: quizzes = [], isLoading } = useAvailableQuizzes(courseId);
  const { data: modules = [] } = useModules(courseId);
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
      toast.error(e instanceof Error ? e.message : 'Could not load your results');
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

  if (isLoading) return <ListSkeleton variant='row' count={2} />;
  if (quizzes.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title='No quizzes available'
        description='Quizzes assigned to this course will appear here when they open.'
      />
    );
  }

  const groups = groupQuizzesByModule(quizzes, modules);
  const showGrouped = groups.length > 1 || (groups[0]?.module ?? null) !== null;

  return (
    <StudentQuizList
      quizzes={quizzes}
      groups={groups}
      showGrouped={showGrouped}
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
  );
}
