import { useQuery } from '@/lib/async-query';
import { fetchAdminCourses } from '../services';

export const adminCoursesKeys = {
  list: (departmentId?: string, facultyId?: string) =>
    ['courses-admin', 'list', departmentId ?? '', facultyId ?? ''] as const,
};

export const useAdminCourses = (params?: { departmentId?: string; facultyId?: string }) =>
  useQuery({
    queryKey: adminCoursesKeys.list(params?.departmentId, params?.facultyId),
    queryFn: () => fetchAdminCourses(params),
  });
