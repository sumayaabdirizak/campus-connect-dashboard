import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import type { OfficeStaffMember, OfficeStaffRole, SupportOffice } from '../types';
import { officeKeys } from './office-queries';

export const officeAdminKeys = {
  staff: (officeId: number) => [...officeKeys.all, 'staff', officeId] as const
};

export type CreateOfficeInput = {
  name: string;
  slug: string;
  description?: string;
  codePrefix?: string;
};

export type UpdateOfficeInput = {
  name?: string;
  description?: string | null;
  codePrefix?: string;
  isActive?: boolean;
};

export function useOfficeStaff(officeId: number | null) {
  return useQuery({
    queryKey: officeId != null ? officeAdminKeys.staff(officeId) : ['offices', 'staff', 'none'],
    queryFn: () => apiClient<OfficeStaffMember[]>(`/offices/${officeId}/staff`),
    enabled: officeId != null
  });
}

export function useCreateOffice() {
  const qc = useQueryClient();
  return useMutation<SupportOffice, CreateOfficeInput>({
    mutationFn: (input) =>
      apiClient<SupportOffice>('/offices', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: officeKeys.list() });
      toast.success('Office created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create office')
  });
}

export function useUpdateOffice(officeId: number) {
  const qc = useQueryClient();
  return useMutation<SupportOffice, UpdateOfficeInput>({
    mutationFn: (input) =>
      apiClient<SupportOffice>(`/offices/${officeId}`, {
        method: 'PATCH',
        body: JSON.stringify(input)
      }),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: officeKeys.list() });
      if (typeof input.isActive === 'boolean') {
        toast.success(input.isActive ? 'Office activated' : 'Office deactivated');
      } else {
        toast.success('Office updated');
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update office')
  });
}

export function useAddOfficeStaff(officeId: number) {
  const qc = useQueryClient();
  return useMutation<OfficeStaffMember, { userId: number; role: OfficeStaffRole }>({
    mutationFn: ({ userId, role }) =>
      apiClient<OfficeStaffMember>(`/offices/${officeId}/staff`, {
        method: 'POST',
        body: JSON.stringify({ userId, role })
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: officeAdminKeys.staff(officeId) });
      toast.success('Staff assigned');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to assign staff')
  });
}

export function useRemoveOfficeStaff(officeId: number) {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, { userId: number }>({
    mutationFn: ({ userId }) =>
      apiClient<{ ok: boolean }>(`/offices/${officeId}/staff/${userId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: officeAdminKeys.staff(officeId) });
      toast.success('Staff removed');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove staff')
  });
}

export function useEnsureDefaultOffices() {
  const qc = useQueryClient();
  return useMutation<{ offices?: SupportOffice[]; results?: SupportOffice[] }, void>({
    mutationFn: () =>
      apiClient<{ offices?: SupportOffice[]; results?: SupportOffice[] }>(
        '/offices/ensure-defaults',
        { method: 'POST' }
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: officeKeys.list() });
      const n = (data?.offices ?? data?.results ?? []).length;
      toast.success(`Default offices ready (${n})`);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to ensure offices')
  });
}
