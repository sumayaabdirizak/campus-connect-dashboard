'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import { Switch } from '@/features/ui/components/switch';
import { NotificationToggle } from '@/components/notifications/notification-toggle';
import { SettingRow } from './profile-rows';
import { ProfileSectionHeading } from './profile-section-heading';
import { ProfileSmsConsentDialog } from './profile-sms-consent-dialog';
import { patchProfileSms, type ProfileMe } from '@/lib/profile/services';

export function ProfileNotificationsCard({
  profile,
  onUpdated,
}: {
  profile: ProfileMe;
  onUpdated: (next: ProfileMe) => void;
}) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingEnable, setPendingEnable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const smsOn = profile.smsOptIn === true;

  async function patchSms(next: boolean) {
    setBusy(true);
    setSmsError(null);
    try {
      const updated = await patchProfileSms(next);
      onUpdated(updated);
    } catch (e) {
      setSmsError(e instanceof Error ? e.message : 'Could not update SMS preference.');
    } finally {
      setBusy(false);
      setConsentOpen(false);
      setPendingEnable(false);
    }
  }

  return (
    <>
      <section className='rounded-xl border border-border bg-card p-4 sm:p-5'>
        <div className='mb-3 flex items-center justify-between gap-3 border-b border-border pb-3'>
          <ProfileSectionHeading
            icon={Bell}
            title='Notifications'
            className='mb-0 border-0 p-0'
          />
          <Link
            href='/dashboard/notifications'
            className='inline-flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground'
          >
            View all
            <ChevronRight className='size-3' aria-hidden />
          </Link>
        </div>
        <div className='-mx-4 divide-y divide-[#F2F4F7] sm:-mx-5'>
          <SettingRow
            title='Browser notifications'
            description='Browser push only. Turning off does not mute in-app or email notifications.'
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
                    void patchSms(false);
                  }
                }}
              />
            }
          />
        </div>
        {smsError ? (
          <p className='mt-2 text-xs text-destructive'>{smsError}</p>
        ) : null}
      </section>

      <ProfileSmsConsentDialog
        open={consentOpen}
        busy={busy}
        pendingEnable={pendingEnable}
        onOpenChange={(open) => {
          setConsentOpen(open);
          if (!open) setPendingEnable(false);
        }}
        onConfirm={() => void patchSms(true)}
      />
    </>
  );
}
