import PageContainer from '@/components/layout/page-container';
import UserListingPage from '@/features/users/components/user-listing';
import { Suspense } from 'react';
import { UsersTableSkeleton } from '@/features/users/components/users-table/index';
import { UserFormSheetTrigger } from '@/features/users/components/user-form-sheet';

import { searchParamsCache } from '@/lib/searchparams';
import { SearchParams } from 'nuqs/server';

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  // Allow nested components to access search params through the cache
  searchParamsCache.parse(await searchParams);

  return (
    <PageContainer
      scrollable={false}
      pageTitle='Users'
      pageDescription='Manage users (React Query + nuqs table pattern.)'
      pageHeaderAction={<UserFormSheetTrigger />}
    >
      <Suspense fallback={<UsersTableSkeleton />}>
        <UserListingPage />
      </Suspense>
    </PageContainer>
  );
}
