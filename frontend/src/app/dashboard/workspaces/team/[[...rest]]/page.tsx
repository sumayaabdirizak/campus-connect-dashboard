'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function TeamPage() {
  return (
    <PageContainer
      pageTitle='Member Management'
      pageDescription='Manage your faculty members, roles, and access.'
    >
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Users className='h-5 w-5 text-primary' />
            <CardTitle>Faculty Members</CardTitle>
          </div>
          <CardDescription>Management is restricted to Faculty Admins.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground italic'>
            List of members and roles would appear here...
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
