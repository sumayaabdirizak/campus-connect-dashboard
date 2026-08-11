import { useQuery } from '@/lib/async-query';
export { fetchFacultiesWithoutDean } from './services';
export type { FacultyOption } from './types';

export const useFacultiesWithoutDean = (search?: string) =>
  useQuery({
    queryKey: ['faculties', 'without-dean', search ?? 'all'],
    queryFn: () => import('./services').then(m => m.fetchFacultiesWithoutDean(search)),
  });
