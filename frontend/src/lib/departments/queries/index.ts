import { useQuery } from '@/lib/async-query';
import { fetchDepartments } from '../services';

export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments
  });
