'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { Input } from '@/features/ui/components/input';
import { Label } from '@/features/ui/components/label';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useMutation, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { useDepartments } from '@/lib/departments/queries';
import { deanApi } from '@/lib/dean/queries/dean-api';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartmentId?: string;
  onCreated?: (course: { id: number; name: string; code: string; department?: { id: number; name: string; code: string } | null }) => void;
};

export function DeanCourseFormSheet({
  open,
  onOpenChange,
  defaultDepartmentId,
  onCreated
}: Props) {
  const queryClient = useQueryClient();
  const { data: departmentsData } = useDepartments();
  const departments = departmentsData?.departments ?? [];
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: String(d.id), label: d.name, sub: d.code })),
    [departments]
  );

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [credits, setCredits] = useState('3');
  const [semesterNumber, setSemesterNumber] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setCode('');
    setDepartmentId(defaultDepartmentId && defaultDepartmentId !== 'all' ? defaultDepartmentId : '');
    setCredits('3');
    setSemesterNumber('');
    setDescription('');
  }, [open, defaultDepartmentId]);

  const mutation = useMutation({
    mutationFn: () =>
      deanApi.createCourse({
        name: name.trim(),
        code: code.trim(),
        departmentId: Number(departmentId),
        credits: Number(credits) || 3,
        semesterNumber: semesterNumber ? Number(semesterNumber) : null,
        description: description.trim() || undefined
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['dean', 'courses'] });
      showToast('success', 'Course created — assign teacher & section next');
      onOpenChange(false);
      if (res?.course) onCreated?.(res.course);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to create course')
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !code.trim() || !departmentId) {
      showToast('error', 'Name, code, and department are required');
      return;
    }
    mutation.mutate();
  };

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title='Add Course'
      description='Create a course catalogue entry for your faculty.'
      formId='dean-course-form'
      submitLabel='Create Course'
      submitting={mutation.isPending}
    >
      <form id='dean-course-form' className='space-y-4 px-4 py-4 sm:px-5' onSubmit={submit}>
        <div className='space-y-1.5'>
          <Label htmlFor='dean-course-name'>Name</Label>
          <Input
            id='dean-course-name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Introduction to Programming'
            required
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='dean-course-code'>Code</Label>
          <Input
            id='dean-course-code'
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='CS101'
            required
          />
        </div>
        <div className='space-y-1.5'>
          <Label>Department</Label>
          <SearchSelect
            options={departmentOptions}
            value={departmentId}
            onValueChange={setDepartmentId}
            placeholder='Select department'
            searchPlaceholder='Search departments...'
            emptyText='No departments found.'
          />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label htmlFor='dean-course-credits'>Credits</Label>
            <Input
              id='dean-course-credits'
              type='number'
              min={0}
              max={30}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='dean-course-sem'>Semester #</Label>
            <Input
              id='dean-course-sem'
              type='number'
              min={1}
              max={12}
              value={semesterNumber}
              onChange={(e) => setSemesterNumber(e.target.value)}
              placeholder='Optional'
            />
          </div>
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='dean-course-desc'>Description</Label>
          <Input
            id='dean-course-desc'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional'
          />
        </div>
      </form>
    </PosFormModal>
  );
}
