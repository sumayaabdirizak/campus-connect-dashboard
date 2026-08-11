/**
 * Batches admin queries
 */

import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';

export const batchesKeys = {
  all: ['batches'] as const,
  sections: (batchId?: string) => [...batchesKeys.all, 'sections', batchId ?? 'all'] as const,
  students: (sectionId?: string) =>
    [...batchesKeys.all, 'students', sectionId ?? 'all'] as const,
};

export const useBatchesSections = (batchId?: string) =>
  useQuery({
    queryKey: batchesKeys.sections(batchId),
    queryFn: () =>
      apiClient<{ results: unknown[] }>(
        batchId ? `/batches/${batchId}/sections` : '/batches/sections'
      ),
    enabled: !!batchId,
  });

export const useBatchesStudents = (sectionId?: string) =>
  useQuery({
    queryKey: batchesKeys.students(sectionId),
    queryFn: () =>
      apiClient<{ results: unknown[] }>(
        sectionId ? `/sections/${sectionId}/students` : '/sections/students'
      ),
    enabled: !!sectionId,
  });
