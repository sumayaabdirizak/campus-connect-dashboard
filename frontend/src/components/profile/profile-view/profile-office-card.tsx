'use client';

import { Building2 } from 'lucide-react';
import type { ProfileMe } from '@/lib/profile/services';
import { ProfileReadOnlyField } from './profile-read-only-field';
import { ProfileSectionHeading } from './profile-section-heading';

const ROLE_LABEL: Record<string, string> = {
  MANAGER: 'Manager',
  AGENT: 'Agent',
};

/** Shown only for users staffing at least one active support office (e.g. Office Staff). */
export function ProfileOfficeCard({ profile }: { profile: ProfileMe }) {
  const memberships = profile.officeMemberships ?? [];
  if (memberships.length === 0) return null;

  return (
    <section className='rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5'>
      <ProfileSectionHeading icon={Building2} title='Office Information' />
      <div className='space-y-4'>
        {memberships.map((m) => (
          <div
            key={m.office.id}
            className='grid gap-3 border-t border-[#F2F4F7] pt-4 first:border-t-0 first:pt-0 sm:grid-cols-2'
          >
            <ProfileReadOnlyField label='Office' value={m.office.name} />
            <ProfileReadOnlyField label='Your role' value={ROLE_LABEL[m.role] ?? m.role} />
            <ProfileReadOnlyField
              label='Scope'
              value={m.office.faculty ? `Faculty · ${m.office.faculty.name}` : 'University-wide'}
            />
            <ProfileReadOnlyField label='Reference prefix' value={m.office.codePrefix} />
          </div>
        ))}
      </div>
    </section>
  );
}
