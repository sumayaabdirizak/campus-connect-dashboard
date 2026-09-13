'use client';

import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/features/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/features/ui/components/dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Header badge icon. Defaults to user-plus (people/create). */
  icon?: ReactNode;
  children: ReactNode;
  formId: string;
  submitLabel?: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitIcon?: 'add' | 'check';
  className?: string;
};

export function PosFormModal({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  formId,
  submitLabel = 'Create New',
  submitting = false,
  submitDisabled = false,
  submitIcon = 'add',
  className,
}: Props) {
  const SubmitIcon = submitIcon === 'check' ? Icons.check : Icons.add;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName='bg-black/45 backdrop-blur-none [backdrop-filter:none]'
        className={cn(
          'flex flex-col gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-xl',
          'max-h-[min(90dvh,720px)] w-[calc(100%-1.5rem)] sm:max-w-md',
          'text-muted-foreground [font-family:var(--font-sans)]',
          '[&_label]:text-sm [&_label]:font-semibold [&_label]:text-foreground',
          '[&_input]:h-10 [&_input]:rounded-lg [&_input]:border-border [&_input]:bg-card',
          '[&_input]:text-foreground [&_input]:placeholder:text-muted-foreground',
          '[&_button[role=combobox]]:h-10 [&_button[role=combobox]]:rounded-lg',
          '[&_button[role=combobox]]:border-border [&_button[role=combobox]]:bg-card',
          '[&_button[role=combobox]]:text-foreground',
          '[&_[data-slot=select-trigger]]:h-10 [&_[data-slot=select-trigger]]:rounded-lg',
          '[&_[data-slot=select-trigger]]:border-border [&_[data-slot=select-trigger]]:bg-card',
          '[&_[data-slot=select-trigger]]:text-foreground',
          '[&_textarea]:rounded-lg [&_textarea]:border-border',
          className
        )}
      >
        <DialogHeader className='shrink-0 space-y-0 border-b border-border bg-muted px-4 pt-4 pb-3 text-left sm:px-5 sm:pt-5 sm:pb-4'>
          <DialogTitle className='flex items-center gap-2.5 pr-6 text-base font-bold text-foreground'>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-white'>
              {icon ?? <Icons.userPlus className='size-4 text-white' />}
            </span>
            <span className='min-w-0 truncate'>{title}</span>
          </DialogTitle>
          <DialogDescription
            className={
              description
                ? 'mt-1.5 pl-[2.875rem] text-xs text-muted-foreground'
                : 'sr-only'
            }
          >
            {description ?? title}
          </DialogDescription>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto bg-card px-4 py-4 sm:px-5'>
          {children}
        </div>

        <DialogFooter className='shrink-0 flex-col-reverse gap-2 border-t border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 sm:space-x-0'>
          <Button
            type='button'
            variant='outline'
            className='h-10 w-full gap-1.5 rounded-lg border-border bg-card text-foreground hover:bg-muted sm:w-auto'
            onClick={() => onOpenChange(false)}
          >
            <Icons.close className='size-4' />
            Cancel
          </Button>
          <Button
            type='submit'
            form={formId}
            disabled={submitting || submitDisabled}
            className={cn(
              'h-10 w-full gap-1.5 rounded-lg border-0 bg-primary text-white shadow-none sm:w-auto',
              'hover:bg-[#2563EB]',
              'disabled:pointer-events-none disabled:bg-[#93C5FD] disabled:text-white disabled:opacity-100'
            )}
          >
            <SubmitIcon className='size-4 text-white' />
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
