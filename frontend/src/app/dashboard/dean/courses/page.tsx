'use client';

import { useState } from 'react';
import {
  useDeanCourses,
  useCreateCourse,
  useAssignTeacherToCourse,
  useDeanTeachers
} from '@/features/dean/api/queries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BookOpen, UserPlus, Search, Users } from 'lucide-react';
import PageContainer from '@/components/layout/page-container';

export default function DeanCoursesPage() {
  const { data, isLoading } = useDeanCourses();
  const { data: teachersData } = useDeanTeachers();
  const createCourse = useCreateCourse();
  const assignTeacher = useAssignTeacherToCourse();

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState('');

  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    departmentId: '',
    credits: '3',
    description: ''
  });

  const [teacherId, setTeacherId] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourse.mutate(
      {
        ...courseForm,
        departmentId: Number(courseForm.departmentId),
        credits: Number(courseForm.credits)
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setCourseForm({ name: '', code: '', departmentId: '', credits: '3', description: '' });
        }
      }
    );
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignOpen) return;
    assignTeacher.mutate(
      {
        courseId: assignOpen.id,
        teacherId: Number(teacherId)
      },
      {
        onSuccess: () => {
          setAssignOpen(null);
          setTeacherId('');
        }
      }
    );
  };

  const courses = (data?.courses ?? []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageContainer>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Course Management</h1>
            <p className='text-muted-foreground'>
              Define your faculty's curriculum and assign subject matter experts.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 h-4 w-4' /> Create Course
          </Button>
        </div>

        <Tabs defaultValue='courses'>
          <TabsList>
            <TabsTrigger value='courses'>Course Inventory</TabsTrigger>
            <TabsTrigger value='assignments'>Teacher Assigning</TabsTrigger>
          </TabsList>

          <TabsContent value='courses' className='mt-4'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-lg'>Faculty Catalogue</CardTitle>
                    <CardDescription>
                      All academic courses defined in your departments.
                    </CardDescription>
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
                  <p className='text-muted-foreground py-8 text-center text-sm'>
                    Loading courses...
                  </p>
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
                        <TableHead>Activity</TableHead>
                        <TableHead className='w-12'></TableHead>
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
                              <span className='text-red-500 text-xs italic'>
                                No teachers assigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {course._count?.offerings && course._count.offerings > 0 ? (
                              <Badge className='bg-green-100 text-green-700 hover:bg-green-100 border-none'>
                                {course._count.offerings} Offerings
                              </Badge>
                            ) : (
                              <Badge variant='secondary'>Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => setAssignOpen({ id: course.id, name: course.name })}
                              className='h-8 gap-1 px-2'
                            >
                              <UserPlus className='h-4 w-4' />
                              <span>Assign</span>
                            </Button>
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
                  <Users className='h-4 w-4' /> Faculty Teaching Matrix
                </CardTitle>
                <CardDescription>
                  A consolidated list of teachers and their registered assignings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className='text-muted-foreground py-8 text-center text-sm'>
                    Loading assignments...
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lecturer</TableHead>
                        <TableHead>Assigned Course</TableHead>
                        <TableHead>Registration Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.flatMap((c) => (c as any).teacherAssignings ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className='text-center py-8 text-muted-foreground'>
                            No teacher assignments registered.
                          </TableCell>
                        </TableRow>
                      ) : (
                        courses
                          .flatMap((c) =>
                            ((c as any).teacherAssignings ?? []).map((ta: any) => ({
                              ...ta,
                              course: c
                            }))
                          )
                          .map((tc: any) => (
                            <TableRow key={tc.id}>
                              <TableCell className='font-medium'>{tc.teacher?.full_name}</TableCell>
                              <TableCell>
                                <div>
                                  <p className='text-sm'>{tc.course?.name}</p>
                                  <p className='text-muted-foreground text-xs'>{tc.course?.code}</p>
                                </div>
                              </TableCell>
                              <TableCell className='text-muted-foreground text-sm'>
                                {new Date(tc.assigned_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Course Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>New Course</DialogTitle>
            <DialogDescription>
              Add a new academic course to your faculty catalogue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className='space-y-4 pt-4'>
            <div className='space-y-1.5'>
              <Label>Course Name</Label>
              <Input
                placeholder='e.g. Advanced Calculus'
                value={courseForm.name}
                onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1.5'>
                <Label>Course Code</Label>
                <Input
                  placeholder='MATH202'
                  value={courseForm.code}
                  onChange={(e) => setCourseForm((f) => ({ ...f, code: e.target.value }))}
                  required
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Credits</Label>
                <Select
                  value={courseForm.credits}
                  onValueChange={(v) => setCourseForm((f) => ({ ...f, credits: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>1 Credit</SelectItem>
                    <SelectItem value='2'>2 Credits</SelectItem>
                    <SelectItem value='3'>3 Credits</SelectItem>
                    <SelectItem value='4'>4 Credits</SelectItem>
                    <SelectItem value='6'>6 Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label>Department ID (Testing)</Label>
              <Input
                type='number'
                placeholder='e.g. 1'
                value={courseForm.departmentId}
                onChange={(e) => setCourseForm((f) => ({ ...f, departmentId: e.target.value }))}
                required
              />
            </div>
            <DialogFooter className='pt-4'>
              <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={createCourse.isPending}>
                {createCourse.isPending ? 'Creating...' : 'Register Course'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={!!assignOpen} onOpenChange={() => setAssignOpen(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Teacher Assigning</DialogTitle>
            <DialogDescription>
              Assign a lecturer to <strong>{assignOpen?.name}</strong> as a subject matter expert.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignSubmit} className='space-y-4 pt-4'>
            <div className='space-y-1.5'>
              <Label>Select Lecturer</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder='Choose teacher...' />
                </SelectTrigger>
                <SelectContent>
                  {teachersData?.teachers?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.full_name} ({t.lecturerProfile?.specialty ?? 'Lecturer'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className='pt-4'>
              <Button type='button' variant='outline' onClick={() => setAssignOpen(null)}>
                Cancel
              </Button>
              <Button type='submit' disabled={assignTeacher.isPending || !teacherId}>
                {assignTeacher.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
