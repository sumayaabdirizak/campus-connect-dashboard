'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { violationLabel } from './violation-label';

export function ViolationWarningDialog({
  activeWarning,
  warnings,
  maxWarnings,
  onDismiss
}: {
  activeWarning: { kind: string; index: number } | null;
  warnings: number;
  maxWarnings: number;
  onDismiss: () => void;
}) {
  return (
    <Dialog
      open={activeWarning !== null}
      onOpenChange={(open) => !open && onDismiss()}
    >
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='w-5 h-5 text-warning' />
            {activeWarning ? violationLabel(activeWarning.kind) : 'Warning'}
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-2 text-sm'>
          <p>
            <span className='font-medium'>
              Warning {warnings} of {maxWarnings}.
            </span>{' '}
            {warnings >= maxWarnings - 1
              ? 'One more warning will auto-submit your quiz with your current answers.'
              : `After ${maxWarnings} warnings the quiz will auto-submit with your current answers.`}
          </p>
          <p className='text-xs text-muted-foreground'>
            Stay on this tab, don&apos;t take screenshots, and avoid copying or
            pasting. Each event is logged for your teacher.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onDismiss} autoFocus>
            I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AutoClosedDialog({
  open,
  maxWarnings,
  loading,
  onViewSubmission
}: {
  open: boolean;
  maxWarnings: number;
  loading: boolean;
  onViewSubmission: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className='max-w-md'
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-destructive'>
            <ShieldAlert className='w-5 h-5' />
            Quiz session closed
          </DialogTitle>
        </DialogHeader>
        <div className='space-y-2 text-sm'>
          <p>
            You reached the {maxWarnings}-warning limit. Your quiz has been
            submitted automatically with the answers you had saved.
          </p>
          <p className='text-xs text-muted-foreground'>
            Your teacher can see this attempt in the results table along with
            the count of monitoring events.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onViewSubmission} disabled={loading} variant='outline'>
            {loading ? 'Loading review…' : 'View my submission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
