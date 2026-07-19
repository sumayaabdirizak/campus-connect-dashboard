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

interface ProfileSmsConsentDialogProps {
  open: boolean;
  busy: boolean;
  pendingEnable: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ProfileSmsConsentDialog({
  open,
  busy,
  pendingEnable,
  onOpenChange,
  onConfirm
}: ProfileSmsConsentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm SMS opt-in</AlertDialogTitle>
          <AlertDialogDescription className='space-y-2 text-left'>
            <span>
              You agree to receive automated text messages from Campus Connect about important
              campus announcements at the phone number we have on file. This is optional and not
              required to use the platform.
            </span>
            <span className='text-muted-foreground block'>
              Reply STOP to opt out of future texts where supported by your carrier; you can also
              disable this here at any time.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy || !pendingEnable}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {busy ? 'Saving…' : 'I agree — enable SMS'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
