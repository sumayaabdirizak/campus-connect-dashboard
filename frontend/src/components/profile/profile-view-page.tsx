'use client';

import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { useAuthStore } from '@/lib/auth-store';
import { useProfileMe } from '@/lib/profile/services';
import type { ProfileMe } from '@/lib/profile/services';
import { ProfileAcademicCard } from './profile-view/profile-academic-card';
import { ProfileBasicInfoCard } from './profile-view/profile-basic-info-card';
import { ProfileNotificationsCard } from './profile-view/profile-notifications-card';
import { ProfileOfficeCard } from './profile-view/profile-office-card';
import { ProfilePasswordCard } from './profile-view/profile-password-card';

export default function ProfileViewPage() {
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data, isLoading, error, refetch, isFetching } = useProfileMe(!!authUser);

  if (!authUser) return null;

  function syncAuth(next: ProfileMe) {
    void refetch();
    setUser({
      id: next.id,
      full_name: next.full_name,
      email: next.email,
      role: next.role as never,
      avatarUrl: next.avatarUrl,
      smsOptIn: next.smsOptIn,
    });
  }

  return (
    <PageContainer>
      <PosPageHeader
        title='Profile'
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        showFullscreen={false}
      />
      <div className='mx-auto w-full max-w-4xl space-y-4'>
        {isLoading && !data ? (
          <div className='h-40 animate-pulse rounded-xl bg-[#F2F4F7]' />
        ) : error && !data ? (
          <div className='rounded-xl border border-[#E5E7EB] bg-white px-4 py-6 text-center text-sm text-[#667085]'>
            Could not load profile.{' '}
            <button
              type='button'
              className='text-[#3B82F6] underline'
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            <ProfileBasicInfoCard profile={data} onUpdated={syncAuth} />
            <ProfilePasswordCard />
            <ProfileAcademicCard profile={data} />
            <ProfileOfficeCard profile={data} />
            <ProfileNotificationsCard profile={data} onUpdated={syncAuth} />
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}
