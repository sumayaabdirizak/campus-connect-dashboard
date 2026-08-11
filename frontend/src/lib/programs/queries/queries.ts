import { useQuery } from '@/lib/async-query';
import { fetchPrograms } from '../services';

export const usePrograms = () =>
  useQuery({
    queryKey: ['programs'],
    queryFn: fetchPrograms
  });
