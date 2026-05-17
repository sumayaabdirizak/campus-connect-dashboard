'use client';

import { useQueryStates } from 'nuqs';
import { searchParams } from '@/lib/searchparams';
import { UsersTable } from './users-table/index';
import { useAuthStore } from '@/lib/auth-store';
import DeanUserManagement from './dean-user-management';

export default function UserListingPage() {
  const user = useAuthStore((state) => state.user);
  const [params] = useQueryStates(searchParams);

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(params.role && { roles: params.role }),
    ...(params.sort && { sort: params.sort })
  };

  if (user?.role === 'DEAN') {
    return <DeanUserManagement />;
  }

  return <UsersTable filters={filters} />;
}
