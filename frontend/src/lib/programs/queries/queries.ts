import { useQuery } from '@/lib/async-query';
import { fetchPrograms } from '../services';

export type UseProgramsParams = {
  departmentId?: string;
  facultyId?: string;
  search?: string;
};

export const usePrograms = (params?: UseProgramsParams) =>
  useQuery({
    queryKey: [
      'programs',
      params?.departmentId ?? '',
      params?.facultyId ?? '',
      params?.search ?? ''
    ],
    queryFn: () => fetchPrograms(params)
  });
