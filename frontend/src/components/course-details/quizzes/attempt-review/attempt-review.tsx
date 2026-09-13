'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';
import { AttemptReviewBanner } from './attempt-review-banner';
import { AttemptReviewQuestion } from './attempt-review-question';
import { areAnswerKeysHidden, buildAnswersByQuestion } from './helpers';

interface AttemptReviewProps {
  attempt: QuizAttempt;
  onBack: () => void;
}

export function AttemptReview({ attempt, onBack }: AttemptReviewProps) {
  const questions = attempt.quiz?.questions ?? [];
  const answersByQuestion = buildAnswersByQuestion(attempt);
  const isOffline = attempt.quiz?.mode === 'offline';
  const isAbsent = attempt.closure_reason === 'absent';
  const isCheat = attempt.closure_reason === 'cheat';
  const answersRevealed = !areAnswerKeysHidden(attempt);

  return (
    <div className='mx-auto max-w-2xl space-y-5'>
      <AttemptReviewBanner attempt={attempt} />

      {!isOffline && !isAbsent && !isCheat ? (
        <div className='space-y-3'>
          <div className='flex items-baseline justify-between gap-2 px-0.5'>
            <h3 className='text-sm font-semibold tracking-tight text-foreground'>
              How you did
            </h3>
            <span className='text-xs tabular-nums text-muted-foreground'>
              {questions.length}{' '}
              {questions.length === 1 ? 'question' : 'questions'}
            </span>
          </div>
          {questions.map((q, i) => (
            <AttemptReviewQuestion
              key={q.id}
              question={q}
              index={i}
              answer={answersByQuestion.get(q.id)}
              answersRevealed={answersRevealed}
            />
          ))}
        </div>
      ) : null}

      <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
        <Button
          variant='outline'
          className='h-11 rounded-full px-5'
          onClick={onBack}
        >
          <ArrowLeft className='size-4' />
          Back to quizzes
        </Button>
        <Button className='h-11 rounded-full px-6' onClick={onBack}>
          Done
        </Button>
      </div>
    </div>
  );
}
