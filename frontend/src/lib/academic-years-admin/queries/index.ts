import { useQuery } from '@/lib/async-query';
import { fetchAdminAcademicYears } from '../services';

export const adminAcademicYearsQueryKey = ['admin-academic-years'] as const;

export const useAdminAcademicYearsList = () =>
  useQuery({ queryKey: adminAcademicYearsQueryKey, queryFn: fetchAdminAcademicYears });
