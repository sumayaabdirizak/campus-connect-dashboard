'use client';

import { Suspense } from 'react';
import AdminUsersPage from '@/components/users/admin-users-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminUsersPage />
    </Suspense>
  );
}
