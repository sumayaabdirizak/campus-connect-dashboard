'use client';

import { useState } from 'react';
import PageContainer from '@/features/layout/components/page-container';
import { Icons } from '@/components/icons';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Button } from '@/features/ui/components/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/components/tabs';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import type { UserRoleTab } from '@/lib/users/services/users-table-utils';
import { BulkStudentsModal } from './bulk-students-modal';
import DeanUserManagement from './dean-user-management';
import { UserFormModal } from './user-form-modal';
import { UsersAdminTable } from './users-admin-table';

export default function AdminUsersPage() {
  const role = useAuthStore((state) => state.user?.role);
  const [tab, setTab] = useState<UserRoleTab>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const queryClient = useQueryClient();

  if (role === 'DEAN') {
    return (
      <PageContainer scrollable>
        <DeanUserManagement />
      </PageContainer>
    );
  }

  const canAdd = role === 'SUPER_ADMIN';

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Users'
        addLabel='Add New'
        onAdd={canAdd ? () => setCreateOpen(true) : undefined}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['users'] })}
      >
        {canAdd ? (
          <Button
            type='button'
            variant='outline'
            className='h-9 flex-1 gap-1.5 rounded-full px-4 sm:flex-none'
            onClick={() => setBulkOpen(true)}
          >
            <Icons.upload className='size-4' />
            Bulk Students
          </Button>
        ) : null}
      </PosPageHeader>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as UserRoleTab)}
        className='gap-3'
      >
        <TabsList className='h-10 w-full max-w-full justify-start overflow-x-auto rounded-full bg-muted/80 p-1 sm:w-auto'>
          <TabsTrigger value='ALL' className='rounded-full px-4'>
            All
          </TabsTrigger>
          <TabsTrigger value='STUDENT' className='rounded-full px-4'>
            Students
          </TabsTrigger>
          <TabsTrigger value='TEACHER' className='rounded-full px-4'>
            Teachers
          </TabsTrigger>
          <TabsTrigger value='DEAN' className='rounded-full px-4'>
            Deans
          </TabsTrigger>
          <TabsTrigger value='STAFF' className='rounded-full px-4'>
            Staff
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className='mt-0'>
          <UsersAdminTable roleTab={tab} />
        </TabsContent>
      </Tabs>

      {canAdd ? (
        <>
          <UserFormModal open={createOpen} onOpenChange={setCreateOpen} />
          <BulkStudentsModal open={bulkOpen} onOpenChange={setBulkOpen} />
        </>
      ) : null}
    </PageContainer>
  );
}
