'use client';

import { Icons } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuditLogsView } from '@/features/admin/components/audit-logs/audit-logs-view';
import { useAuthStore } from '@/lib/auth-store';

export default function AuditLogsPage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    return (
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
    );
  }

  return (
    <AuditLogsView />
  );
}
