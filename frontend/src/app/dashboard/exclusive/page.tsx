'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth-store';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ExclusivePage() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <PageContainer isLoading={false}>
      {!isSuperAdmin ? (
        <div className='flex h-full items-center justify-center'>
          <Alert>
            <Icons.lock className='h-5 w-5 text-yellow-600' />
            <AlertDescription>
              <div className='mb-1 text-lg font-semibold'>Access Restricted</div>
              <div className='text-muted-foreground'>
                This page is only available to users with the{' '}
                <span className='font-semibold'>Super Admin</span> role.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div className='space-y-6'>
          <div>
            <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
              <Icons.badgeCheck className='h-7 w-7 text-green-600' />
              Super Admin Settings
            </h1>
            <p className='text-muted-foreground'>Global configuration for Campus Connect.</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>
                Perform global database cleanups or platform-wide updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-lg'>Platform is currently running in stable mode.</div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
