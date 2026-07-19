'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { QuizAttempt } from '../../api/quizzes-types';
import { AttemptReviewBanner } from './attempt-review-banner';
import { AttemptReviewQuestion } from './attempt-review-question';
import { buildAnswersByQuestion } from './helpers';

interface AttemptReviewProps {
  attempt: QuizAttempt;
  onBack: () => void;
}

export function AttemptReview({ attempt, onBack }: AttemptReviewProps) {
  const questions = attempt.quiz?.questions ?? [];
  const answersByQuestion = buildAnswersByQuestion(attempt);

  return (
    <div className='space-y-4'>
      <Button variant='ghost' onClick={onBack} className='gap-1'>
        <ArrowLeft className='w-4 h-4' /> Back to quizzes
      </Button>

      <AttemptReviewBanner attempt={attempt} />

      <div className='space-y-3'>
        {questions.map((q, i) => (
          <AttemptReviewQuestion
            key={q.id}
            question={q}
            index={i}
            answer={answersByQuestion.get(q.id)}
          />
        ))}
      </div>

      <div className='flex justify-end pt-2'>
        <Button onClick={onBack}>Done</Button>
      </div>
    </div>
  );
}
