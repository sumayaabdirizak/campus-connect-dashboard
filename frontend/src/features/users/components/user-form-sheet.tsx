'use client';

import React, { useState } from 'react';
import { useRegisterUser } from '../api/mutations';
import { useBatchSections, useCourses, useAcademicYears } from '../api/queries';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

export function UserFormSheetTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className='mr-2 h-4 w-4' /> Add User
      </Button>
      <UserFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

interface UserFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any; // For editing
}

export function UserFormSheet({ open, onOpenChange, user }: UserFormSheetProps) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'STUDENT',
    password: '',
    departmentCode: user?.departmentCode || '',
    batchSectionId: '',
    academicYearId: '',
    semesterId: '1', // Defaults to 1 for First Semester
    courseIds: [] as string[]
  });

  const mutation = useRegisterUser();
  const { data: sectionsData } = useBatchSections();
  const { data: coursesData } = useCourses();
  const { data: academicYearsData } = useAcademicYears();

  const sections = sectionsData?.sections || [];
  const courses = coursesData?.courses || [];
  const academicYears = academicYearsData?.academicYears || academicYearsData?.data || [];

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleRoleChange(val: string) {
    setForm((f) => ({ ...f, role: val }));
  }

  function toggleCourse(courseId: string) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(courseId)
        ? f.courseIds.filter((id) => id !== courseId)
        : [...f.courseIds, courseId]
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...form,
      departmentCode:
        form.role === 'STUDENT' || form.role === 'TEACHER' ? form.departmentCode : undefined
    };

    mutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        setForm({
          full_name: '',
          email: '',
          role: 'STUDENT',
          password: '',
          departmentCode: '',
          batchSectionId: '',
          academicYearId: '',
          semesterId: '1',
          courseIds: []
        });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>{user ? 'Edit User' : 'Add New User'}</SheetTitle>
          <SheetDescription>
            {user
              ? 'Update academic account details.'
              : 'Create a new user account in the campus system.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-4 h-full flex flex-col'>
          <ScrollArea className='flex-1 pr-4 -mr-4'>
            <div className='space-y-4 pr-1 pb-20'>
              <div className='space-y-1.5'>
                <Label htmlFor='full_name'>Full Name</Label>
                <Input
                  id='full_name'
                  name='full_name'
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder='e.g. John Doe'
                  required
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='email'>Email Address</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  value={form.email}
                  onChange={handleChange}
                  placeholder='john@university.edu'
                  required
                />
              </div>

              {!user && (
                <div className='space-y-1.5'>
                  <Label htmlFor='password'>Temporary Password</Label>
                  <Input
                    id='password'
                    name='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='••••••••'
                    required
                  />
                </div>
              )}

              <div className='space-y-1.5'>
                <Label>Academic Role</Label>
                <Select value={form.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder='Select a role' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='STUDENT'>STUDENT</SelectItem>
                    <SelectItem value='TEACHER'>TEACHER</SelectItem>
                    <SelectItem value='DEAN'>DEAN</SelectItem>
                    <SelectItem value='SUPER_ADMIN'>SUPER_ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.role === 'STUDENT' || form.role === 'TEACHER') && (
                <div className='space-y-1.5'>
                  <Label htmlFor='departmentCode'>Department Code</Label>
                  <Input
                    id='departmentCode'
                    name='departmentCode'
                    value={form.departmentCode}
                    onChange={handleChange}
                    placeholder='e.g. CS, ENG, BUS'
                    required
                  />
                </div>
              )}

              {/* STUDENT SPECIFIC FIELDS */}
              {form.role === 'STUDENT' && (
                <div className='space-y-4 mt-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50'>
                  <h4 className='text-sm font-semibold'>Student Enrollment</h4>

                  <div className='space-y-1.5'>
                    <Label>Assign Batch Section</Label>
                    <Select
                      value={form.batchSectionId}
                      onValueChange={(val) => setForm((f) => ({ ...f, batchSectionId: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select Section' />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((sec: any) => (
                          <SelectItem key={sec.id} value={sec.id.toString()}>
                            {sec.batch?.name} - {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label>Academic Year</Label>
                    <Select
                      value={form.academicYearId}
                      onValueChange={(val) => setForm((f) => ({ ...f, academicYearId: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select Year' />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((ay: any) => (
                          <SelectItem key={ay.id} value={ay.id.toString()}>
                            {ay.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label>Semester Number</Label>
                    <Select
                      value={form.semesterId}
                      onValueChange={(val) => setForm((f) => ({ ...f, semesterId: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select Semester' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='1'>First Semester</SelectItem>
                        <SelectItem value='2'>Second Semester</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* TEACHER SPECIFIC FIELDS */}
              {form.role === 'TEACHER' && (
                <div className='space-y-4 mt-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50'>
                  <h4 className='text-sm font-semibold'>Teacher Course Assignments</h4>

                  <div className='space-y-3'>
                    <Label>Assign Courses</Label>
                    {courses.length > 0 ? (
                      courses.map((course: any) => (
                        <div key={course.id} className='flex items-center space-x-2'>
                          <Checkbox
                            id={`course-${course.id}`}
                            checked={form.courseIds.includes(course.id.toString())}
                            onCheckedChange={() => toggleCourse(course.id.toString())}
                          />
                          <Label
                            htmlFor={`course-${course.id}`}
                            className='text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                          >
                            <span className='font-medium text-slate-800 dark:text-slate-200'>
                              {course.code}
                            </span>{' '}
                            - {course.name}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className='text-sm text-slate-500'>No courses available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className='absolute bottom-0 right-0 w-full p-6 pt-2 bg-background border-t'>
            <Button type='submit' className='w-full' disabled={mutation.isPending}>
              {mutation.isPending ? 'Processing...' : user ? 'Update Account' : 'Create Account'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
