'use client';

import { FileText, Pencil, X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

export function AssignmentModalShell({
  open,
  onOpenChange,
  title,
  mode,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mode: 'create' | 'edit';
  children: React.ReactNode;
}) {
  const Icon = mode === 'edit' ? Pencil : FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-theme='campus-connect'
        className='flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground shadow-lg sm:max-w-2xl [&>button]:hidden'
      >
        <div className='flex items-center justify-between border-b border-border px-5 py-4'>
          <DialogHeader className='gap-0 text-left'>
            <DialogTitle className='flex items-center gap-2.5 font-display tracking-tight text-foreground'>
              <span className='flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary'>
                <Icon className='size-4' aria-hidden />
              </span>
              {title}
            </DialogTitle>
          </DialogHeader>
          <DialogClose className='flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'>
            <X className='size-4' aria-hidden />
            <span className='sr-only'>Close</span>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
