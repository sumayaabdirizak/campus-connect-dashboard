'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import type { User } from '@/lib/auth-store';
import PageContainer from '@/components/layout/page-container';
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
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { roleBadgeVariant } from '@/lib/role-badge';
import { cn } from '@/lib/utils';

/**
 * "Your Profile" surface. Wraps `PageContainer` directly because the route
 * (`/dashboard/profile`) doesn't impose one — this page owns its own title.
 *
 * Roles render through `roleBadgeVariant()` so the colours match every
 * other place that shows roles (e.g. the users table) and dark mode works
 * automatically — replaces the previous hand-rolled `bg-blue-100` / `bg-
 * green-100` map that ignored the theme.
 */
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
    <PageContainer pageTitle='Your Profile' pageDescription='Account details and notification preferences.'>
      <div className='space-y-6'>
        <Card className='max-w-2xl'>
          <CardHeader className='flex flex-row items-center gap-4'>
            <Avatar className='h-20 w-20'>
              <AvatarFallback className='bg-primary/10 text-primary text-2xl font-bold'>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className='space-y-2'>
              <CardTitle className='text-2xl'>{displayName}</CardTitle>
              {/* Role badge via the shared helper — same visual as the users
                  table, same Badge primitive, theme- and dark-mode-safe. */}
              <Badge variant={role.variant} className={cn(role.className)}>
                {role.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>Email</p>
                <p className='text-base'>{user.email}</p>
              </div>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>User ID</p>
                <p className='font-mono text-base'>#{user.id}</p>
              </div>
            </div>

            <div className='border-border space-y-3 rounded-lg border p-4'>
              <div className='flex items-center justify-between gap-4'>
                <div className='space-y-1'>
                  <Label htmlFor='sms-opt-in' className='text-base font-medium'>
                    SMS for urgent campus announcements
                  </Label>
                  <p className='text-muted-foreground text-sm'>
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
              {smsError ? <p className='text-destructive text-sm'>{smsError}</p> : null}
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
                <span className='text-muted-foreground block'>
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
    </PageContainer>
  );
}
