import { useQuery } from '@/lib/async-query';
import { fetchDepartments } from './service';

export const useDepartments = () =>
  useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments
  });
