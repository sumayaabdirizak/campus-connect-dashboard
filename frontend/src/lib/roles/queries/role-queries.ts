import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import type { PlatformRole } from '../types';

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const
};

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: async () => {
      const data = await apiClient<
        PlatformRole[] | { roles?: PlatformRole[]; results?: PlatformRole[] }
      >('/roles');
      if (Array.isArray(data)) return data;
      return data.roles ?? data.results ?? [];
    }
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation<PlatformRole, { name: string }>({
    mutationFn: ({ name }) =>
      apiClient<PlatformRole>('/roles', {
        method: 'POST',
        body: JSON.stringify({ name })
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success('Role created');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create role')
  });
}
