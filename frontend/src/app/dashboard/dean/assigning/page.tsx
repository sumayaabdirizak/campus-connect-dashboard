'use client';

import { useDeanTeachers, useDeanOfferings } from '@/features/dean/api/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';
import { DeanOfferingsTab } from '@/features/dean/components/assigning/dean-offerings-tab';
import { DeanTeachersTab } from '@/features/dean/components/assigning/dean-teachers-tab';

export default function DeanAssignmentsPage() {
  const { data: offeringsData } = useDeanOfferings();
  const { data: teachersData } = useDeanTeachers();

  return (
    <PageContainer>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Academic Overview</h1>
          <p className='text-muted-foreground'>
            Course offerings and teacher assignments across your faculty.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-purple-100 p-3'>
                <Users className='h-5 w-5 text-purple-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Faculty Teachers</p>
                <p className='text-2xl font-bold'>{teachersData?.teachers?.length ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='flex items-center gap-4 pt-6'>
              <div className='rounded-full bg-green-100 p-3'>
                <GraduationCap className='h-5 w-5 text-green-600' />
              </div>
              <div>
                <p className='text-muted-foreground text-sm'>Active Offerings</p>
                <p className='text-2xl font-bold'>{offeringsData?.offerings?.length ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue='offerings'>
          <TabsList>
            <TabsTrigger value='offerings'>Offerings</TabsTrigger>
            <TabsTrigger value='teachers'>Teachers</TabsTrigger>
          </TabsList>
          <TabsContent value='offerings' className='mt-4'>
            <DeanOfferingsTab />
          </TabsContent>
          <TabsContent value='teachers' className='mt-4'>
            <DeanTeachersTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
