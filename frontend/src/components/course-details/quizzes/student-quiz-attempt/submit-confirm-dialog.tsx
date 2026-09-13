'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Check } from 'lucide-react';
import type { QuizAttemptAnswer } from '@/lib/course-details/services/quizzes-types';

export function SubmitConfirmDialog({
  open,
  onOpenChange,
  answeredCount,
  totalQuestions,
  answers,
  questions,
  currentIdx,
  onNavigate,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answeredCount: number;
  totalQuestions: number;
  answers: Record<number, QuizAttemptAnswer>;
  questions: { id: number }[];
  currentIdx: number;
  onNavigate: (idx: number) => void;
  onConfirm: () => void;
}) {
  const unanswered = totalQuestions - answeredCount;

  const isAnswered = (q: { id: number }) => {
    const a = answers[q.id];
    return (
      (a?.selected_option_id ?? null) !== null ||
      (a?.text_answer != null && a.text_answer.trim() !== '')
    );
  };

  // Questions are one-way — the rules gate makes students acknowledge that
  // before the timer starts. So only offer to jump to an unanswered question
  // they can still legitimately reach; anything behind them is already final,
  // and navigating back there would quietly break the rule they agreed to.
  const reachableUnansweredIdx = questions.findIndex(
    (q, i) => i >= currentIdx && !isAnswered(q)
  );
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit your attempt?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-2 text-sm'>
              {answeredCount < totalQuestions ? (
                <div className='space-y-1'>
                  <p className='flex items-start gap-2 text-warning'>
                    <AlertTriangle className='w-4 h-4 shrink-0 mt-0.5' />
                    <span>
                      You have <strong>{unanswered}</strong> unanswered question
                      {unanswered === 1 ? '' : 's'}. Unanswered questions earn no marks.
                    </span>
                  </p>
                  {reachableUnansweredIdx !== -1 ? (
                    <button
                      type='button'
                      className='text-xs underline text-muted-foreground hover:text-foreground'
                      onClick={() => {
                        onOpenChange(false);
                        onNavigate(reachableUnansweredIdx);
                      }}
                    >
                      Go to next unanswered question
                    </button>
                  ) : (
                    <p className='text-xs text-muted-foreground'>
                      The ones you skipped are behind you and can&apos;t be
                      reopened.
                    </p>
                  )}
                </div>
              ) : (
                <p className='flex items-start gap-2 text-success'>
                  <Check className='w-4 h-4 shrink-0 mt-0.5' />
                  <span>All {totalQuestions} questions answered.</span>
                </p>
              )}
              <p className='text-muted-foreground'>
                Once submitted, you can&apos;t change your answers. This will
                count as one of your attempts.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep working</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Submit now</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
