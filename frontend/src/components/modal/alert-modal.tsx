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
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
}

/**
 * Reusable confirmation dialog. Defaults preserve the original "Are you sure? /
 * This action cannot be undone." copy so existing call sites are unchanged, but
 * every string + the confirm variant can now be overridden per use. Built on
 * Radix AlertDialog (role="alertdialog"; focus trap, Escape, and overlay are
 * handled for us).
 */
export function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  variant = 'destructive'
}: AlertModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onClose}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={onConfirm}
            className={cn(variant === 'destructive' && buttonVariants({ variant: 'destructive' }))}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
