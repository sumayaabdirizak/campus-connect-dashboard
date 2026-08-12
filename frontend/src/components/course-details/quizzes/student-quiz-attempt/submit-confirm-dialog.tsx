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
  onNavigate,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answeredCount: number;
  totalQuestions: number;
  answers: Record<number, QuizAttemptAnswer>;
  questions: { id: number }[];
  onNavigate: (idx: number) => void;
  onConfirm: () => void;
}) {
  const unanswered = totalQuestions - answeredCount;
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
                      {unanswered === 1 ? '' : 's'}. Unanswered questions score
                      zero.
                    </span>
                  </p>
                  <button
                    type='button'
                    className='text-xs underline text-muted-foreground hover:text-foreground'
                    onClick={() => {
                      onOpenChange(false);
                      const firstIdx = questions.findIndex((q) => {
                        const ans = answers[q.id];
                        return !(
                          (ans?.selected_option_id ?? null) !== null ||
                          (ans?.text_answer != null &&
                            ans.text_answer.trim() !== '')
                        );
                      });
                      if (firstIdx !== -1) onNavigate(firstIdx);
                    }}
                  >
                    Go to first unanswered question
                  </button>
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
