import { useQuery } from '@/lib/async-query';
import {
  fetchAdminAcademicYears,
  fetchAdminBatches,
  fetchAdminBatchSections,
  fetchAdminPrograms,
  fetchBatchSectionsByBatch
} from '../services';

export const adminBatchesQueryKey = ['admin-batches'] as const;
export const adminBatchSectionsQueryKey = ['admin-batch-sections'] as const;

export const useAdminBatches = () =>
  useQuery({ queryKey: adminBatchesQueryKey, queryFn: fetchAdminBatches });

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
