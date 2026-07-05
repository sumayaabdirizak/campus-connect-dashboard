'use client';

import { useState } from 'react';
import { useDeanCourses, useDeanTeachers } from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Search, Users } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

export default function DeanCoursesPage() {
  const { data, isLoading } = useDeanCourses();
  const { data: teachersData } = useDeanTeachers();
  const [search, setSearch] = useState('');

  const courses = (data?.courses ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageContainer>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Courses</h1>
          <p className='text-muted-foreground'>
            Faculty course catalogue and teacher assignments.
          </p>
        </div>

        <Tabs defaultValue='courses'>
          <TabsList>
            <TabsTrigger value='courses'>Course Catalogue</TabsTrigger>
            <TabsTrigger value='assignments'>Teacher Assignments</TabsTrigger>
          </TabsList>

          <TabsContent value='courses' className='mt-4'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-lg'>Faculty Catalogue</CardTitle>
                    <CardDescription>All academic courses in your faculty.</CardDescription>
                  </div>
                  <div className='relative w-64'>
                    <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
                    <Input
                      placeholder='Filter courses...'
                      className='pl-9'
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className='text-muted-foreground py-8 text-center text-sm'>Loading courses...</p>
                ) : courses.length === 0 ? (
                  <div className='py-12 text-center text-muted-foreground'>
                    <BookOpen className='mx-auto mb-2 h-10 w-10 opacity-20' />
                    <p>No courses found.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Teachers</TableHead>
                        <TableHead>Offerings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <p className='font-semibold'>{course.name}</p>
                            <p className='text-muted-foreground text-xs'>
                              {course.code} · {course.credits} Credits
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant='secondary'>{course.department.code}</Badge>
                          </TableCell>
                          <TableCell>
                            {(course as any).teacherAssignings?.length > 0 ? (
                              <div className='flex flex-wrap gap-1'>
                                {(course as any).teacherAssignings.map((tc: any) => (
                                  <Badge key={tc.id} variant='outline' className='text-[10px]'>
                                    {tc.teacher.full_name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className='text-muted-foreground text-xs italic'>None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {course._count?.offerings ? (
                              <Badge className='bg-green-100 text-green-700 hover:bg-green-100 border-none'>
                                {course._count.offerings} offerings
                              </Badge>
                            ) : (
                              <Badge variant='secondary'>Inactive</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='assignments' className='mt-4'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg flex items-center gap-2'>
                  <Users className='h-4 w-4' /> Teaching Matrix
                </CardTitle>
                <CardDescription>
                  All lecturers and the courses they are assigned to.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lecturer</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.courses ?? []).flatMap((c) => (c as any).teacherAssignings ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className='text-center py-8 text-muted-foreground'>
                          No teacher assignments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (data?.courses ?? [])
                        .flatMap((c) =>
                          ((c as any).teacherAssignings ?? []).map((ta: any) => ({ ...ta, course: c }))
                        )
                        .map((tc: any) => (
                          <TableRow key={tc.id}>
                            <TableCell className='font-medium'>{tc.teacher?.full_name}</TableCell>
                            <TableCell>
                              <p className='text-sm'>{tc.course?.name}</p>
                              <p className='text-muted-foreground text-xs'>{tc.course?.code}</p>
                            </TableCell>
                            <TableCell className='text-muted-foreground text-sm'>
                              {new Date(tc.assigned_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
