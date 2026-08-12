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
import { Keyboard } from 'lucide-react';

export function ShortcutsDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='max-w-sm'>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            <Keyboard className='w-4 h-4' />
            Keyboard shortcuts
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className='space-y-2 text-sm'>
              <ul className='space-y-1.5'>
                <li className='flex items-center justify-between gap-3'>
                  <span className='text-muted-foreground'>Pick option A–I</span>
                  <span className='flex gap-1'>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                      1
                    </kbd>
                    <span className='text-muted-foreground'>–</span>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                      9
                    </kbd>
                  </span>
                </li>
                <li className='flex items-center justify-between gap-3'>
                  <span className='text-muted-foreground'>Next question</span>
                  <span className='flex gap-1'>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                      →
                    </kbd>
                    <span className='text-muted-foreground'>or</span>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                      J
                    </kbd>
                  </span>
                </li>
                <li className='flex items-center justify-between gap-3'>
                  <span className='text-muted-foreground'>Submit attempt</span>
                  <span className='flex gap-1 items-center'>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                      Ctrl
                    </kbd>
                    <span className='text-muted-foreground'>+</span>
                    <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                      Enter
                    </kbd>
                  </span>
                </li>
                <li className='flex items-center justify-between gap-3'>
                  <span className='text-muted-foreground'>Toggle this overlay</span>
                  <kbd className='px-1.5 py-0.5 text-[10px] rounded border bg-muted/50 font-sans'>
                    ?
                  </kbd>
                </li>
              </ul>
              <p className='text-xs text-muted-foreground pt-2 border-t'>
                Shortcuts pause while typing in the short-answer box.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>Got it</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
