'use client';

import { useState } from 'react';
import { useDeanTeachers, useDeanOfferings } from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Users, UserCheck, Search, GraduationCap } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

// ── Offerings Tab (read-only) ───────────────────────────────────────────────
function OfferingsTab() {
  const { data, isLoading } = useDeanOfferings();
  const offerings = data?.offerings ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <UserCheck className='h-5 w-5' /> Course Offerings
        </CardTitle>
        <CardDescription>
          Academic courses active in sections for the current term.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
        ) : offerings.length === 0 ? (
          <div className='py-12 text-center'>
            <UserCheck className='text-muted-foreground mx-auto mb-2 h-10 w-10 opacity-20' />
            <p className='text-muted-foreground text-sm'>No course offerings found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Section / Batch</TableHead>
                <TableHead>Term</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offerings.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className='font-medium'>{o.course.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {o.course.code} · {o.course.credits} Credits
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className='text-sm'>{o.section.name}</p>
                    <p className='text-muted-foreground text-xs'>
                      {o.section.batch.name} ({o.section.batch.program.name})
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{o.semester.name}</Badge>
                    <p className='text-muted-foreground mt-1 text-xs'>{o.academicYear.name}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Teachers Tab (read-only) ────────────────────────────────────────────────
function TeachersTab() {
  const { data, isLoading } = useDeanTeachers();
  const [search, setSearch] = useState('');

  const teachers = (data?.teachers ?? []).filter(
    (t) =>
      !search ||
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <GraduationCap className='h-5 w-5' /> Faculty Teachers
        </CardTitle>
        <CardDescription>All lecturers affiliated with your faculty.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='relative'>
          <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
          <Input
            placeholder='Search teachers...'
            className='pl-9'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <p className='text-muted-foreground py-8 text-center text-sm'>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Assignments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='py-8 text-center text-muted-foreground'>
                    No teachers found.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className='font-medium'>{t.full_name}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>{t.email}</TableCell>
                    <TableCell>
                      {t.lecturerProfile?.specialty ? (
                        <Badge variant='outline'>{t.lecturerProfile.specialty}</Badge>
                      ) : (
                        <span className='text-muted-foreground text-sm'>General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={(t as any).totalAssignments > 0 ? 'default' : 'secondary'}>
                        {(t as any).totalAssignments ?? 0}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
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
            <OfferingsTab />
          </TabsContent>
          <TabsContent value='teachers' className='mt-4'>
            <TeachersTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
