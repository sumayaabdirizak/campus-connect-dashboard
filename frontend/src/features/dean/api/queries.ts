import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { deanApi } from './dean-api';
import { toast } from 'sonner';

// ── Query Keys ─────────────────────────────────────────────────────────────
export const deanKeys = {
  users: (params?: any) => ['dean', 'users', params] as const,
  user: (id: number) => ['dean', 'user', id] as const,
  pendingRegistrations: () => ['dean', 'registrations', 'pending'] as const,
  batches: (params?: any) => ['dean', 'batches', params] as const,
  batch: (id: number) => ['dean', 'batch', id] as const,
  batchSections: (batchId: number) => ['dean', 'batch', batchId, 'sections'] as const,
  section: (id: number) => ['dean', 'section', id] as const,
  teachers: (params?: any) => ['dean', 'teachers', params] as const,
  unassignedTeachers: () => ['dean', 'teachers', 'unassigned'] as const,
  unassignedSections: () => ['dean', 'sections', 'unassigned'] as const,
  courses: (params?: any) => ['dean', 'courses', params] as const,
  course: (id: number) => ['dean', 'course', id] as const,
  offerings: (params?: any) => ['dean', 'offerings', params] as const
};

// ── Users ──────────────────────────────────────────────────────────────────

export const useDeanUsers = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.users(params),
    queryFn: () => deanApi.getUsers(params)
  });

export const useDeanUser = (id: number) =>
  useQuery({
    queryKey: deanKeys.user(id),
    queryFn: () => deanApi.getUserById(id),
    enabled: !!id
  });

export const useUpdateDeanUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => deanApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'users'] });
      toast.success('User updated successfully');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useRemoveDeanUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deanApi.removeUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'users'] });
      toast.success('User removed');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

// ── Registrations ──────────────────────────────────────────────────────────

export const usePendingRegistrations = () =>
  useQuery({
    queryKey: deanKeys.pendingRegistrations(),
    queryFn: () => deanApi.getPendingRegistrations()
  });

export const useApproveRegistration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deanApi.approveRegistration(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'registrations'] });
      qc.invalidateQueries({ queryKey: ['dean', 'users'] });
      toast.success('Registration approved!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useRejectRegistration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deanApi.rejectRegistration(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'registrations'] });
      toast.success('Registration rejected');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useAssignStudentToSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: any }) =>
      deanApi.assignStudentToSection(studentId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean'] });
      toast.success('Student assigned to section!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

// ── Batches ────────────────────────────────────────────────────────────────

export const useDeanBatches = (params?: Record<string, string>, enabled: boolean = true) =>
  useQuery({
    queryKey: deanKeys.batches(params),
    queryFn: () => deanApi.getBatches(params),
    enabled
  });

export const useDeanBatch = (id: number) =>
  useQuery({
    queryKey: deanKeys.batch(id),
    queryFn: () => deanApi.getBatchById(id),
    enabled: !!id
  });

export const useCreateDeanBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => deanApi.createBatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'batches'] });
      toast.success('Batch created!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useUpdateDeanBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => deanApi.updateBatch(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'batches'] });
      toast.success('Batch updated!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useDeleteDeanBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deanApi.deleteBatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'batches'] });
      toast.success('Batch deleted');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

// ── Sections ───────────────────────────────────────────────────────────────

export const useBatchSections = (batchId: number, enabled: boolean = true) =>
  useQuery({
    queryKey: deanKeys.batchSections(batchId),
    queryFn: () => deanApi.getBatchSections(batchId),
    enabled: !!batchId && enabled
  });

export const useCreateSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, name }: { batchId: number; name: string }) =>
      deanApi.createSection(batchId, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean', 'batch'] });
      toast.success('Section created!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useUpdateSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => deanApi.updateSection(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean'] });
      toast.success('Section updated!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useDeleteSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deanApi.deleteSection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dean'] });
      toast.success('Section deleted');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

// ── Teachers ───────────────────────────────────────────────────────────────

export const useDeanTeachers = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.teachers(params),
    queryFn: () => deanApi.getTeachers(params)
  });

export const useUnassignedTeachers = () =>
  useQuery({
    queryKey: deanKeys.unassignedTeachers(),
    queryFn: () => deanApi.getUnassignedTeachers()
  });

export const useUnassignedSections = () =>
  useQuery({
    queryKey: deanKeys.unassignedSections(),
    queryFn: () => deanApi.getUnassignedSections()
  });

// ── Courses ───────────────────────────────────────────────────────────────

export const useDeanCourses = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.courses(params),
    queryFn: () => deanApi.getCourses(params)
  });

export const useDeanCourse = (id: number) =>
  useQuery({
    queryKey: deanKeys.course(id),
    queryFn: () => deanApi.getCourseById(id),
    enabled: !!id
  });

export const useCreateCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => deanApi.createCourse(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deanKeys.courses() });
      toast.success('Course created successfully!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useAssignTeacherToCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, teacherId }: { courseId: number; teacherId: number }) =>
      deanApi.assignTeacherToCourse(courseId, teacherId),
    onSuccess: (_, { courseId }) => {
      qc.invalidateQueries({ queryKey: deanKeys.course(courseId) });
      qc.invalidateQueries({ queryKey: deanKeys.courses() });
      toast.success('Teacher assigned to course!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

// ── Course Offerings ───────────────────────────────────────────────────────

export const useDeanOfferings = (params?: Record<string, string>) =>
  useQuery({
    queryKey: deanKeys.offerings(params),
    queryFn: () => deanApi.getOfferings(params)
  });

export const useCreateOffering = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => deanApi.createOffering(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deanKeys.offerings() });
      qc.invalidateQueries({ queryKey: deanKeys.courses() });
      toast.success('Course offered successfully!');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};

export const useDeleteOffering = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deanApi.deleteOffering(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deanKeys.offerings() });
      toast.success('Course offering removed');
    },
    onError: (e: Error) => toast.error(e.message)
  });
};
