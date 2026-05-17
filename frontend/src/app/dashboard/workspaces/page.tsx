'use client';

import PageContainer from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BookOpen, Users } from 'lucide-react';

export default function WorkspacesPage() {
  const faculties = [
    { name: 'Faculty of Engineering', depts: 5, students: 1200 },
    { name: 'Faculty of Science', depts: 4, students: 800 },
    { name: 'Faculty of Arts', depts: 6, students: 1500 },
    { name: 'Faculty of Business', depts: 3, students: 900 }
  ];

  return (
    <PageContainer
      pageTitle='Faculties & Departments'
      pageDescription='Overview of all academic divisions within Campus Connect'
    >
      <div className='grid gap-4 md:grid-cols-2'>
        {faculties.map((f) => (
          <Card key={f.name}>
            <CardHeader>
              <CardTitle>{f.name}</CardTitle>
              <CardDescription>Academic Division</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex gap-4'>
                <div className='flex items-center text-sm text-muted-foreground'>
                  <BookOpen className='mr-2 h-4 w-4' />
                  {f.depts} Departments
                </div>
                <div className='flex items-center text-sm text-muted-foreground'>
                  <Users className='mr-2 h-4 w-4' />
                  {f.students} Students
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
