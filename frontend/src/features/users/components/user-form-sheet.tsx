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
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserFormStudentSection } from './user-form-student-section';
import { UserFormTeacherSection } from './user-form-teacher-section';

const EMPTY_FORM = {
  full_name: '',
  email: '',
  role: 'STUDENT',
  password: '',
  departmentCode: '',
  batchSectionId: '',
  academicYearId: '',
  semesterId: '1',
  courseIds: [] as string[],
};

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
  user?: { full_name?: string; email?: string; role?: string; departmentCode?: string };
}

export function UserFormSheet({ open, onOpenChange, user }: UserFormSheetProps) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'STUDENT',
    departmentCode: user?.departmentCode || '',
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

  function toggleCourse(courseId: string) {
    setForm((f) => ({
      ...f,
      courseIds: f.courseIds.includes(courseId)
        ? f.courseIds.filter((id) => id !== courseId)
        : [...f.courseIds, courseId],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...form,
      departmentCode:
        form.role === 'STUDENT' || form.role === 'TEACHER' ? form.departmentCode : undefined,
    };

    mutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        setForm(EMPTY_FORM);
      },
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
                <Select value={form.role} onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}>
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

              {form.role === 'STUDENT' && (
                <UserFormStudentSection
                  form={form}
                  onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                  sections={sections}
                  academicYears={academicYears}
                />
              )}

              {form.role === 'TEACHER' && (
                <UserFormTeacherSection
                  courseIds={form.courseIds}
                  onToggleCourse={toggleCourse}
                  courses={courses}
                />
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
