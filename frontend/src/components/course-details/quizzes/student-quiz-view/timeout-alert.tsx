'use client';

import { Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { QuizAttempt } from '@/lib/course-details/services/quizzes-types';

export function TimeoutAlert({
  timedOutAttempt,
  onClose,
}: {
  timedOutAttempt: QuizAttempt | null;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={!!timedOutAttempt} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <Clock className='w-5 h-5 text-warning' />
            Time&apos;s up — we submitted for you
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-2 text-sm'>
              <p>
                The timer ran out, so we submitted whatever you had answered. Anything you typed
                in the last 1–2 seconds may not have made it.
              </p>
              <p className='text-muted-foreground'>
                Your marks and the answer review are ready below.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>See results</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
