'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import type { User } from '@/lib/auth-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ProfileViewPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  if (!user) return null;

  const displayName = user.full_name || (user as { name?: string }).name || 'Unknown User';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleColors: Record<string, string> = {
    STUDENT: 'bg-blue-100 text-blue-800',
    TEACHER: 'bg-green-100 text-green-800',
    DEAN: 'bg-purple-100 text-purple-800',
    SUPER_ADMIN: 'bg-red-100 text-red-800',
  };

  const smsOn = user.smsOptIn === true;

  async function patchSmsOptIn(next: boolean) {
    setBusy(true);
    setSmsError(null);
    try {
      const updated = await apiClient<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ smsOptIn: next }),
      });
      setUser(updated);
    } catch (e) {
      setSmsError(e instanceof Error ? e.message : 'Could not update SMS preference.');
    } finally {
      setBusy(false);
      setConsentOpen(false);
      setPendingEnable(false);
    }
  }

  return (
    <div className='flex w-full flex-col p-4 space-y-6'>
      <h2 className='text-3xl font-bold tracking-tight'>Your Profile</h2>
      <Card className='max-w-2xl'>
        <CardHeader className='flex flex-row items-center gap-4'>
          <Avatar className='h-20 w-20'>
            <AvatarFallback className='text-2xl bg-primary/10 text-primary font-bold'>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className='space-y-2'>
            <CardTitle className='text-2xl'>{displayName}</CardTitle>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${roleColors[user.role] ?? 'bg-gray-100 text-gray-800'}`}
            >
              {user.role}
            </span>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Email</p>
              <p className='text-base'>{user.email}</p>
            </div>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>User ID</p>
              <p className='text-base font-mono'>#{user.id}</p>
            </div>
          </div>

          <div className='rounded-lg border border-border p-4 space-y-3'>
            <div className='flex items-center justify-between gap-4'>
              <div className='space-y-1'>
                <Label htmlFor='sms-opt-in' className='text-base font-medium'>
                  SMS for urgent campus announcements
                </Label>
                <p className='text-sm text-muted-foreground'>
                  When enabled, we may send short SMS about time-sensitive announcements to the phone number on your
                  account. Message and data rates may apply. You can turn this off anytime.
                </p>
              </div>
              <Switch
                id='sms-opt-in'
                checked={smsOn}
                disabled={busy}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setPendingEnable(true);
                    setConsentOpen(true);
                  } else {
                    void patchSmsOptIn(false);
                  }
                }}
              />
            </div>
            {smsError ? <p className='text-sm text-destructive'>{smsError}</p> : null}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={consentOpen}
        onOpenChange={(open) => {
          setConsentOpen(open);
          if (!open) setPendingEnable(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm SMS opt-in</AlertDialogTitle>
            <AlertDialogDescription className='space-y-2 text-left'>
              <span>
                You agree to receive automated text messages from Campus Connect about important campus announcements
                at the phone number we have on file. This is optional and not required to use the platform.
              </span>
              <span className='block text-muted-foreground'>
                Reply STOP to opt out of future texts where supported by your carrier; you can also disable this here at
                any time.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || !pendingEnable}
              onClick={(e) => {
                e.preventDefault();
                void patchSmsOptIn(true);
              }}
            >
              {busy ? 'Saving…' : 'I agree — enable SMS'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
