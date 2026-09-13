'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PosFormModal } from '@/features/pos/components/pos-form-modal';
import { Label } from '@/features/ui/components/label';
import { SearchSelect } from '@/features/ui/components/search-select';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { handleApiError, showToast } from '@/lib/notifications';
import { useActiveSemesterWindow } from '@/lib/academic/use-active-semester-window';
import { useAdminAcademicYears } from '@/lib/batches-admin/queries';
import {
  useBatchSections,
  useDeanBatches,
  useDeanTeachers,
  deanKeys
} from '@/lib/dean/queries';
import { deanApi } from '@/lib/dean/queries/dean-api';
import type { Course, DeanBatch } from '@/lib/dean/types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  defaultBatchId?: number | null;
};

function parseBatches(raw: unknown): DeanBatch[] {
  if (Array.isArray(raw)) return raw as DeanBatch[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { batches?: DeanBatch[] }).batches)) {
    return (raw as { batches: DeanBatch[] }).batches;
  }
  return [];
}

function parseTeachers(raw: unknown): { id: number; full_name: string }[] {
  if (Array.isArray(raw)) return raw as { id: number; full_name: string }[];
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as {
    teachers?: { id: number; full_name: string }[];
    results?: { id: number; full_name: string }[];
  };
  if (Array.isArray(obj.teachers)) return obj.teachers;
  if (Array.isArray(obj.results)) return obj.results;
  return [];
}

function parseSections(raw: unknown): { id: number; name: string }[] {
  if (Array.isArray(raw)) return raw as { id: number; name: string }[];
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as {
    sections?: { id: number; name: string }[];
    results?: { id: number; name: string }[];
  };
  if (Array.isArray(obj.sections)) return obj.sections;
  if (Array.isArray(obj.results)) return obj.results;
  return [];
}

function parseCourses(raw: unknown): Course[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as { courses?: Course[]; results?: Course[] };
  if (Array.isArray(obj.courses)) return obj.courses;
  if (Array.isArray(obj.results)) return obj.results;
  return [];
}

export function DeanAssignCourseSheet({
  open,
  onOpenChange,
  course: courseProp = null,
  defaultBatchId = null
}: Props) {
  const queryClient = useQueryClient();
  const lockedCourse = courseProp ?? null;
  const needCoursePicker = !lockedCourse;

  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const courseParams = { limit: '200' };
  const { data: coursesData } = useQuery({
    queryKey: deanKeys.courses(courseParams),
    queryFn: () => deanApi.getCourses(courseParams),
    enabled: open && needCoursePicker
  });
  const courseOptions = useMemo(() => {
    const courses = parseCourses(coursesData);
    return courses.map((c) => ({
      value: String(c.id),
      label: `${c.code} — ${c.name}`,
      sub: c.department?.name
    }));
  }, [coursesData]);

  const selectedCourse: Course | null = useMemo(() => {
    if (lockedCourse) return lockedCourse;
    const courses = parseCourses(coursesData);
    return courses.find((c) => String(c.id) === courseId) ?? null;
  }, [lockedCourse, coursesData, courseId]);

  const { data: batchesData } = useDeanBatches(undefined, open);
  const batches = useMemo(() => parseBatches(batchesData), [batchesData]);
  const batchOptions = useMemo(
    () =>
      batches.map((b) => ({
        value: String(b.id),
        label: b.name,
        sub: b.program?.name
      })),
    [batches]
  );

  const batchIdNum = batchId ? Number(batchId) : 0;
  const { data: sectionsData } = useBatchSections(batchIdNum, open && batchIdNum > 0);
  const sections = useMemo(() => parseSections(sectionsData), [sectionsData]);
  const sectionOptions = useMemo(
    () => sections.map((s) => ({ value: String(s.id), label: s.name })),
    [sections]
  );

  const { data: teachersData } = useDeanTeachers(open ? { limit: '200' } : undefined);
  const teachers = useMemo(() => parseTeachers(teachersData), [teachersData]);
  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ value: String(t.id), label: t.full_name })),
    [teachers]
  );

  const { data: academicYears = [] } = useAdminAcademicYears();
  const { data: activeWindow } = useActiveSemesterWindow();
  const yearOptions = useMemo(
    () => academicYears.map((y) => ({ value: String(y.id), label: y.name })),
    [academicYears]
  );
  const selectedYear = useMemo(
    () => academicYears.find((y) => String(y.id) === academicYearId),
    [academicYears, academicYearId]
  );
  const semesters = selectedYear?.semesters ?? [];
  const semesterOptions = useMemo(
    () => semesters.map((s) => ({ value: String(s.id), label: s.name })),
    [semesters]
  );

  useEffect(() => {
    if (!open) return;
    setCourseId(lockedCourse ? String(lockedCourse.id) : '');
    setBatchId(defaultBatchId ? String(defaultBatchId) : '');
    setSectionId('');
    setTeacherId('');
    const yearId = activeWindow?.academicYearId;
    const semId = activeWindow?.semesterId;
    setAcademicYearId(yearId ? String(yearId) : '');
    setSemesterId(semId ? String(semId) : '');
  }, [open, lockedCourse?.id, defaultBatchId, activeWindow?.academicYearId, activeWindow?.semesterId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedCourse) throw new Error('No course selected');
      if (!teacherId) throw new Error('Teacher is required');
      return deanApi.createOffering({
        courseId: selectedCourse.id,
        sectionId: Number(sectionId),
        semesterId: Number(semesterId),
        academicYearId: Number(academicYearId),
        teacherId: Number(teacherId)
      });
    },
    onSuccess: (res: { message?: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['dean', 'courses'] });
      void queryClient.invalidateQueries({ queryKey: ['dean', 'offerings'] });
      void queryClient.invalidateQueries({ queryKey: ['dean', 'batches'] });
      void queryClient.invalidateQueries({ queryKey: ['batch-overview'] });
      showToast('success', res?.message ?? 'Offering created (course + teacher + section)');
      onOpenChange(false);
    },
    onError: (error: unknown) => handleApiError(error, 'Failed to create offering')
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCourse) {
      showToast('error', 'Select a course');
      return;
    }
    if (!teacherId) {
      showToast('error', 'Select a teacher — required for the offering');
      return;
    }
    if (!batchId || !sectionId) {
      showToast('error', 'Select batch and section');
      return;
    }
    if (!academicYearId || !semesterId) {
      showToast('error', 'Select academic year and semester');
      return;
    }
    if (sections.length === 0) {
      showToast('error', 'This batch has no sections — add a section first');
      return;
    }
    mutation.mutate();
  };

  return (
    <PosFormModal
      open={open}
      onOpenChange={onOpenChange}
      title='Assign Course to Batch'
      description='Creates a course offering: course + teacher + section + term.'
      formId='dean-assign-course-form'
      submitLabel='Create Offering'
      submitting={mutation.isPending}
      className='sm:max-w-lg'
    >
      <form id='dean-assign-course-form' className='space-y-4 px-4 py-4 sm:px-5' onSubmit={submit}>
        {needCoursePicker ? (
          <div className='space-y-1.5'>
            <Label>Course</Label>
            <SearchSelect
              options={courseOptions}
              value={courseId}
              onValueChange={(v) => {
                setCourseId(v);
                setTeacherId('');
              }}
              placeholder='Select course'
              searchPlaceholder='Search courses...'
              emptyText='No courses found.'
            />
          </div>
        ) : selectedCourse ? (
          <div className='rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm'>
            <p className='font-semibold text-foreground'>
              {selectedCourse.code} · {selectedCourse.name}
            </p>
            <p className='text-xs text-muted-foreground'>
              {selectedCourse.department?.name ?? '—'}
            </p>
          </div>
        ) : null}

        <div className='space-y-1.5'>
          <Label>Teacher (required)</Label>
          <SearchSelect
            options={teacherOptions}
            value={teacherId}
            onValueChange={setTeacherId}
            placeholder='Select teacher for this offering'
            searchPlaceholder='Search teachers...'
            emptyText='No teachers found.'
          />
        </div>

        <div className='space-y-1.5'>
          <Label>Batch</Label>
          <SearchSelect
            options={batchOptions}
            value={batchId}
            onValueChange={(v) => {
              setBatchId(v);
              setSectionId('');
            }}
            placeholder='Select batch'
            searchPlaceholder='Search batches...'
            emptyText='No batches found.'
          />
        </div>

        <div className='space-y-1.5'>
          <Label>Section</Label>
          <SearchSelect
            options={sectionOptions}
            value={sectionId}
            onValueChange={setSectionId}
            disabled={!batchId}
            placeholder={
              !batchId
                ? 'Pick a batch first'
                : sections.length === 0
                  ? 'No sections — create one first'
                  : 'Select section'
            }
            searchPlaceholder='Search sections...'
            emptyText='No sections found.'
          />
        </div>

        <div className='space-y-1.5'>
          <Label>Academic year</Label>
          <SearchSelect
            options={yearOptions}
            value={academicYearId}
            onValueChange={(v) => {
              setAcademicYearId(v);
              setSemesterId('');
            }}
            placeholder='Select academic year'
            searchPlaceholder='Search years...'
            emptyText='No academic years found.'
          />
        </div>

        <div className='space-y-1.5'>
          <Label>Semester</Label>
          <SearchSelect
            options={semesterOptions}
            value={semesterId}
            onValueChange={setSemesterId}
            disabled={!academicYearId}
            placeholder={
              academicYearId
                ? semesters.length === 0
                  ? 'No semesters on this year'
                  : 'Select semester'
                : 'Pick academic year first'
            }
            searchPlaceholder='Search semesters...'
            emptyText='No semesters found.'
          />
        </div>
      </form>
    </PosFormModal>
  );
}
