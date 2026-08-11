import { useQuery } from '@/lib/async-query';
import { fetchUsers, fetchBatchSections, fetchCourses, fetchAcademicYears } from '../services';
import { UserFilters } from '../types';

export const useUsers = (filters: UserFilters = {}, opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
    enabled: opts?.enabled !== false
  });

export const useUsersByRole = (role: string) =>
  useQuery({
    queryKey: ['users', { roles: role }],
    queryFn: () => fetchUsers({ roles: role })
  });

export const usersQueryOptions = (filters: UserFilters = {}) => ({
  queryKey: ['users', filters],
  queryFn: () => fetchUsers(filters)
});

export const useBatchSections = () =>
  useQuery({ queryKey: ['batchSections'], queryFn: fetchBatchSections });
export const useCourses = () => useQuery({ queryKey: ['courses'], queryFn: fetchCourses });
export const useAcademicYears = () =>
  useQuery({ queryKey: ['academicYears'], queryFn: fetchAcademicYears });
