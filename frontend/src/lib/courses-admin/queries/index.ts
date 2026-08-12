import { useQuery } from '@/lib/async-query';
import { fetchAdminCourses } from '../services';

export const adminCoursesKeys = {
  list: (departmentId?: string) => ['courses-admin', 'list', departmentId] as const,
};

export const useAdminCourses = (departmentId?: string) =>
  useQuery({
    queryKey: adminCoursesKeys.list(departmentId),
    queryFn: () => fetchAdminCourses(departmentId ? { departmentId } : undefined),
  });
