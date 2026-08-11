'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import PageContainer from '@/features/layout/components/page-container';
import { PosPageHeader } from '@/features/pos/components/pos-page-header';
import { Alert, AlertDescription } from '@/features/ui/components/alert';
import { Button } from '@/features/ui/components/button';
import { useQueryClient } from '@/lib/async-query';
import { useAuthStore } from '@/lib/auth-store';
import { canEnsureOfficeDefaults, canManageOffices, isDeanRole } from '@shared/roles';
import { useEnsureDefaultOffices } from '@/lib/offices/queries';
import { officeKeys } from '@/lib/offices/queries';
import type { SupportOffice } from '@/lib/offices/types';
import { CreateOfficeDialog } from './create-office-dialog';
import { EditOfficeDialog } from './edit-office-dialog';
import { OfficeStaffSheet } from './office-staff-sheet';
import { OfficesAdminTable } from './offices-admin-table';

export function OfficesAdminPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canManageOffices(role);
  const canCreate = canManage && !isDeanRole(role);
  const canEnsureDefaults = canEnsureOfficeDefaults(role);
  const queryClient = useQueryClient();
  const ensureDefaults = useEnsureDefaultOffices();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOffice, setEditOffice] = useState<SupportOffice | null>(null);
  const [staffOffice, setStaffOffice] = useState<SupportOffice | null>(null);

  if (!canManage) {
    return (
      <div className='flex flex-1 items-center justify-center py-16'>
        <Alert>
          <Icons.lock className='h-5 w-5 text-yellow-600' />
          <AlertDescription>
            <div className='mb-1 text-lg font-semibold'>Access restricted</div>
            <div className='text-muted-foreground'>
              Only academic leadership and deans can manage offices.
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PageContainer scrollable={false}>
      <PosPageHeader
        title='Offices'
        addLabel='Add New'
        onAdd={canCreate ? () => setCreateOpen(true) : undefined}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: officeKeys.list() })}
      >
        {canEnsureDefaults ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={ensureDefaults.isPending}
            onClick={() => ensureDefaults.mutate()}
          >
            {ensureDefaults.isPending ? 'Ensuring…' : 'Ensure defaults'}
          </Button>
        ) : null}
      </PosPageHeader>
      <OfficesAdminTable onManageStaff={setStaffOffice} onEdit={setEditOffice} />
      <CreateOfficeDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditOfficeDialog
        office={editOffice}
        open={editOffice != null}
        onOpenChange={(open) => {
          if (!open) setEditOffice(null);
        }}
      />
      <OfficeStaffSheet
        office={staffOffice}
        onOpenChange={(open) => {
          if (!open) setStaffOffice(null);
        }}
      />
    </PageContainer>
  );
}
