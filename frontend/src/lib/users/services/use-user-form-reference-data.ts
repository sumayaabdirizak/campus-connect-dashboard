import { useAdminBatches } from '@/lib/batches-admin/queries';
import { useDepartments } from '@/lib/departments/queries';
import { normalizeFacultiesList } from '@/lib/faculties/faculty-list';
import { usePrograms } from '@/lib/programs/queries';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@/lib/async-query';
import { useAcademicYears, useBatchSections } from '../queries';

export function useUserFormReferenceData(open: boolean) {
  const { data: sectionsData } = useBatchSections();
  const { data: academicYearsData } = useAcademicYears();
  const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();
  const { data: programsData } = usePrograms();
  const { data: batchesData } = useAdminBatches();
  const { data: faculties = [] } = useQuery({
    queryKey: ['faculties', 'all-for-user-form'],
    queryFn: async () => {
      const data = await apiClient<{
        faculties?: Array<{ id: number; name: string; code: string }>;
        results?: Array<{ id: number; name: string; code: string }>;
      }>('/faculties?limit=200');
      return normalizeFacultiesList(data);
    },
    enabled: open
  });

  const sections = (sectionsData?.sections ?? []).map((s: any) => ({
    ...s,
    batchId: s.batch?.id ?? s.batchId ?? 0
  }));

  return {
    sections,
    academicYears: academicYearsData?.academicYears ?? [],
    departments: departmentsData?.departments ?? [],
    departmentsLoading,
    programs: programsData?.programs ?? [],
    batches: batchesData?.batches ?? [],
    faculties
  };
}

