import { useQuery } from '@/lib/async-query';
import { fetchPrograms } from './service';

export const usePrograms = () =>
  useQuery({
    queryKey: ['programs'],
    queryFn: fetchPrograms
  });
