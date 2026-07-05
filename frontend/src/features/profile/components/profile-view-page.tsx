'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import type { User } from '@/lib/auth-store';
import PageContainer from '@/components/layout/page-container';
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
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { NotificationToggle } from '@/features/notifications/notification-toggle';
import { roleBadgeVariant } from '@/lib/role-badge';
import { cn } from '@/lib/utils';

function ProfileRow({
  label,
  value,
  mono
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className='flex items-center justify-between gap-4 px-4 py-3'>
      <span className='text-sm text-muted-foreground'>{label}</span>
      <span className={cn('truncate text-sm font-medium', mono && 'font-mono tabular-nums')}>
        {value}
      </span>
    </div>
  );
}

function SettingRow({
  id,
  title,
  description,
  control
}: {
  id?: string;
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className='flex items-start justify-between gap-4 px-4 py-3'>
      <div className='min-w-0 space-y-0.5'>
        {id ? (
          <Label htmlFor={id} className='text-sm font-medium'>
            {title}
          </Label>
        ) : (
          <p className='text-sm font-medium'>{title}</p>
        )}
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
      <div className='shrink-0 pt-0.5'>{control}</div>
    </div>
  );
}

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

  const role = roleBadgeVariant(user.role);
  const smsOn = user.smsOptIn === true;

  async function patchSmsOptIn(next: boolean) {
    setBusy(true);
    setSmsError(null);
    try {
      const updated = await apiClient<User>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ smsOptIn: next })
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
    <PageContainer pageTitle='Profile' pageDescription='Your account and notification settings.'>
      <div className='mx-auto w-full max-w-xl space-y-4'>
        <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
          <div className='flex items-center gap-3 px-4 py-4'>
            <Avatar className='size-12'>
              <AvatarFallback className='bg-primary/10 text-primary text-sm font-semibold'>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0'>
              <p className='truncate text-base font-semibold'>{displayName}</p>
              <div className='mt-1 flex flex-wrap items-center gap-2'>
                <Badge variant={role.variant} className={cn('h-5 text-[10px]', role.className)}>
                  {role.label}
                </Badge>
                <span className='truncate text-xs text-muted-foreground'>{user.email}</span>
              </div>
            </div>
          </div>

          <div className='divide-y border-t'>
            <ProfileRow label='Email' value={user.email} />
            <ProfileRow label='User ID' value={`#${user.id}`} mono />
          </div>
        </div>

        <div className='overflow-hidden rounded-xl border bg-card shadow-sm'>
          <div className='flex items-center justify-between border-b px-4 py-2.5'>
            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              Notifications
            </p>
            <Link
              href='/dashboard/notifications'
              className='inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground'
            >
              View all
              <ChevronRight className='size-3' aria-hidden />
            </Link>
          </div>

          <div className='divide-y'>
            <SettingRow
              title='Browser notifications'
              description='Alerts for grades, assignments, and announcements.'
              control={<NotificationToggle />}
            />
            <SettingRow
              id='sms-opt-in'
              title='SMS announcements'
              description='Urgent campus alerts to your phone. Rates may apply.'
              control={
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
              }
            />
          </div>

          {smsError ? (
            <p className='border-t px-4 py-2 text-xs text-destructive'>{smsError}</p>
          ) : null}
        </div>
      </div>

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
                void patchSmsOptIn(true);
              }}
            >
              {busy ? 'Saving…' : 'I agree — enable SMS'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
