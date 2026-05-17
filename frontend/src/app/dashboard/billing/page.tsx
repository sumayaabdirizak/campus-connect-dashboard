'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';

export default function BillingPage() {
  return (
    <PageContainer
      isLoading={false}
      pageTitle='Academic Subscription'
      pageDescription={`Manage the university subscription and resource limits.`}
    >
      <div className='space-y-6'>
        <Alert>
          <Icons.info className='h-4 w-4' />
          <AlertDescription>
            The system subscription is managed by the central digital office. For quota increases,
            please contact ICT support.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Current Plan: University Enterprise</CardTitle>
            <CardDescription>
              Unlimited students and storage for the 2025/2026 Academic Year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='p-4 border rounded-lg'>
                <p className='text-sm font-medium text-muted-foreground'>Students</p>
                <p className='text-2xl font-bold'>Unlimited</p>
              </div>
              <div className='p-4 border rounded-lg'>
                <p className='text-sm font-medium text-muted-foreground'>Storage</p>
                <p className='text-2xl font-bold'>10 TB</p>
              </div>
              <div className='p-4 border rounded-lg'>
                <p className='text-sm font-medium text-muted-foreground'>Courses</p>
                <p className='text-2xl font-bold'>500 Max</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
