'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Check, ShieldAlert } from 'lucide-react';

export function RulesGateDialog({
  open,
  maxWarnings,
  confidenceScoring,
  onAcknowledge
}: {
  open: boolean;
  maxWarnings: number;
  confidenceScoring: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className='max-w-md'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <ShieldAlert className='w-5 h-5 text-warning' />
            Before you start — important rules
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-3 text-sm'>
              <ul className='space-y-2 list-disc pl-4 text-muted-foreground'>
                <li>
                  <strong className='text-foreground'>
                    Don&apos;t leave this tab or window
                  </strong>{' '}
                  — switching tabs or minimising earns a warning.
                </li>
                <li>
                  <strong className='text-foreground'>No copying or pasting</strong>{' '}
                  — both actions earn a warning.
                </li>
                <li>
                  <strong className='text-foreground'>Questions are one-way</strong>{' '}
                  — once you move to the next question you cannot go back.
                </li>
                <li>
                  <strong className='text-foreground'>Screenshots are traceable</strong>{' '}
                  — quiz content is watermarked with your name and can be linked
                  back to your account.
                </li>
                <li>
                  After{' '}
                  <strong className='text-foreground'>{maxWarnings} warnings</strong>{' '}
                  the quiz auto-submits with whatever answers you have saved.
                </li>
                {confidenceScoring ? (
                  <li>
                    <strong className='text-foreground'>Confidence scoring is on</strong>{' '}
                    — you&apos;ll mark each answer Low / Medium / High.
                    Confidently-wrong answers lose half their points, so
                    don&apos;t guess.
                  </li>
                ) : null}
              </ul>
              <p className='text-[11px] italic text-muted-foreground border-t pt-2'>
                Your activity is monitored to ensure academic integrity. The
                timer starts now.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className='w-full gap-1' onClick={onAcknowledge}>
            <Check className='w-4 h-4' /> I understand — let&apos;s begin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
