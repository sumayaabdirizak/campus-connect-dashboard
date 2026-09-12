import { useQuery } from '@/lib/async-query';
import {
  fetchAdminAcademicYears,
  fetchAdminBatches,
  fetchAdminBatchSections,
  fetchAdminPrograms,
  fetchBatchOverview,
  fetchBatchSectionsByBatch
} from '../services';

export const adminBatchesQueryKey = ['admin-batches'] as const;
export const adminBatchSectionsQueryKey = ['admin-batch-sections'] as const;

export type UseAdminBatchesParams = {
  programId?: string;
  departmentId?: string;
  facultyId?: string;
};

export const useAdminBatches = (params?: UseAdminBatchesParams) =>
  useQuery({
    queryKey: [
      ...adminBatchesQueryKey,
      params?.programId ?? '',
      params?.departmentId ?? '',
      params?.facultyId ?? ''
    ],
    queryFn: () => fetchAdminBatches(params)
  });

export const useAdminBatchSections = () =>
  useQuery({ queryKey: adminBatchSectionsQueryKey, queryFn: fetchAdminBatchSections });

export const useAdminPrograms = () =>
  useQuery({ queryKey: ['admin-programs'], queryFn: fetchAdminPrograms });

export const useAdminAcademicYears = () =>
  useQuery({ queryKey: ['admin-academic-years'], queryFn: fetchAdminAcademicYears });

export const useBatchSections = (batchId: number, enabled = true) =>
  useQuery({
    queryKey: ['batch-sections', batchId],
    queryFn: () => fetchBatchSectionsByBatch(batchId),
    enabled: enabled && batchId > 0
  });

export const useBatchOverview = (batchId: number, enabled = true) =>
  useQuery({
    queryKey: ['batch-overview', batchId],
    queryFn: () => fetchBatchOverview(batchId),
    enabled: enabled && batchId > 0
  });
