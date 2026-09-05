'use client';

import { Icons } from '@/components/icons';
import PageContainer from '@/features/layout/components/page-container';
import { Alert, AlertDescription } from '@/features/ui/components/alert';
import { AuditLogsView } from '@/components/admin/audit-logs/audit-logs-view';
import { useAuthStore } from '@/lib/auth-store';

export default function AuditLogsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    return (
      <PageContainer scrollable>
        <div className='flex flex-1 items-center justify-center py-16'>
          <Alert>
            <Icons.lock className='h-5 w-5 text-yellow-600' />
            <AlertDescription>
              <div className='mb-1 text-lg font-semibold'>Access restricted</div>
              <div className='text-muted-foreground'>
                Audit logs are only available to super administrators.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </PageContainer>
    );
  }

  return <AuditLogsView />;
}
