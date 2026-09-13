'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Alert, AlertDescription } from '@/features/ui/components/alert';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import { roleKeys } from '@/lib/roles/queries';
import { CreateRoleDialog } from './create-role-dialog';
import { RolesAdminTable } from './roles-admin-table';

export function RolesAdminPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className='flex flex-1 items-center justify-center py-16'>
        <Alert>
          <Icons.lock className='h-5 w-5 text-yellow-600' />
          <AlertDescription>
            <div className='mb-1 text-lg font-semibold'>Access restricted</div>
            <div className='text-muted-foreground'>
              Only super administrators can manage platform roles.
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Roles'
        addLabel='Add New'
        onAdd={() => setCreateOpen(true)}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: roleKeys.list() })}
      />
      <RolesAdminTable />
      <CreateRoleDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageContainer>
  );
}
