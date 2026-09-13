'use client';

import { BriefcaseMedical } from 'lucide-react';
import { splitFullName } from '@/lib/profile/services';
import type { ProfileMe } from '@/lib/profile/services';
import { ProfileAvatarField } from './profile-avatar-field';
import { ProfileReadOnlyField } from './profile-read-only-field';
import { ProfileSectionHeading } from './profile-section-heading';

export function ProfileBasicInfoCard({
  profile,
  onUpdated,
}: {
  profile: ProfileMe;
  onUpdated: (next: ProfileMe) => void;
}) {
  const { firstName, lastName } = splitFullName(profile.full_name);

  return (
    <section className='rounded-xl border border-border bg-card p-4 sm:p-5'>
      <ProfileSectionHeading icon={BriefcaseMedical} title='Basic Information' />
      <div className='space-y-4'>
        <ProfileAvatarField profile={profile} onUpdated={onUpdated} />
        <div className='grid gap-3 sm:grid-cols-2'>
          <ProfileReadOnlyField
            id='profile-first-name'
            label='First Name'
            value={firstName}
          />
          <ProfileReadOnlyField
            id='profile-last-name'
            label='Last Name'
            value={lastName}
          />
          <ProfileReadOnlyField
            id='profile-email'
            label='Email'
            value={profile.email || ''}
            required
          />
          <ProfileReadOnlyField
            id='profile-phone'
            label='Phone Number'
            value={profile.phone?.trim() || ''}
          />
          <ProfileReadOnlyField
            id='profile-university-id'
            label='University ID'
            value={profile.number || ''}
          />
          <ProfileReadOnlyField
            id='profile-user-id'
            label='User ID'
            value={`#${profile.id}`}
          />
        </div>
        <p className='text-xs text-muted-foreground'>
          Only your photo can be changed. Contact an administrator to update other details.
        </p>
      </div>
    </section>
  );
}
