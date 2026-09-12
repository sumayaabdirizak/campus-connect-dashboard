import { useQuery } from '@/lib/async-query';
import { fetchDepartments, type FetchDepartmentsParams } from '../services';

export const useDepartments = (params?: FetchDepartmentsParams) =>
  useQuery({
    queryKey: ['departments', params?.facultyId ?? '', params?.search ?? ''],
    queryFn: () => fetchDepartments(params)
  });
