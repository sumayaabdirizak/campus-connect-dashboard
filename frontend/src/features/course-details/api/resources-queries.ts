import { queryOptions, useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  uploadResourceFile,
  getModules,
  createModule,
  updateModule,
  deleteModule,
  reorderResources,
  reorderModules
} from './resources-service';
import {
  CreateResourceData,
  ResourceFilters,
  UpdateResourceData,
  CreateModuleData,
  UpdateModuleData,
  ReorderItem
} from './resources-types';

export const resourceKeys = {
  all: ['resources'] as const,
  list: (courseId: string, filters?: ResourceFilters) =>
    [...resourceKeys.all, 'list', courseId, filters] as const,
  detail: (resourceId: string) => [...resourceKeys.all, 'detail', resourceId] as const,
  modules: (courseOfferingId: string) =>
    [...resourceKeys.all, 'modules', courseOfferingId] as const
};

export const resourcesQueryOptions = (courseId: string, filters?: ResourceFilters) =>
  queryOptions({
    queryKey: resourceKeys.list(courseId, filters),
    queryFn: () => getResources(courseId, filters)
  });

export const resourceDetailQueryOptions = (resourceId: string) =>
  queryOptions({
    queryKey: resourceKeys.detail(resourceId),
    queryFn: () => getResource(resourceId)
  });

export const modulesQueryOptions = (courseOfferingId: string) =>
  queryOptions({
    queryKey: resourceKeys.modules(courseOfferingId),
    queryFn: () => getModules(courseOfferingId)
  });

export function useResources(courseId: string, filters?: ResourceFilters) {
  return useQuery(resourcesQueryOptions(courseId, filters));
}

export function useModules(courseOfferingId: string) {
  return useQuery(modulesQueryOptions(courseOfferingId));
}

export function useCreateResource(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateResourceData) => createResource(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    }
  });
}

export function useUpdateResource(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resourceId, data }: { resourceId: number; data: UpdateResourceData }) =>
      updateResource(String(resourceId), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    }
  });
}

export function useDeleteResource(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: number) => deleteResource(String(resourceId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    }
  });
}

export function useUploadResourceFile() {
  return useMutation({
    mutationFn: (file: File) => uploadResourceFile(file)
  });
}

// ─── Module mutations ──────────────────────────────────────────────────────

export function useCreateModule(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModuleData) => createModule(courseOfferingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.modules(courseOfferingId) });
    }
  });
}

export function useUpdateModule(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: UpdateModuleData }) =>
      updateModule(moduleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.modules(courseOfferingId) });
    }
  });
}

export function useDeleteModule(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: number) => deleteModule(moduleId),
    onSuccess: () => {
      // Resources with moduleId === deleted module fall back to "Ungrouped",
      // so we also refresh the resource list.
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    }
  });
}

/// Used by the drag-reorder UI. We don't optimistically update the list here
/// — the caller patches the cache before the mutation fires, then this
/// invalidation reconciles with whatever the server actually committed.
export function useReorderResources(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: ReorderItem[]) => reorderResources(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.list(courseId) });
    }
  });
}

export function useReorderModules(courseOfferingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Pick<ReorderItem, 'id' | 'position'>[]) => reorderModules(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.modules(courseOfferingId) });
    }
  });
}

export { createResource, updateResource, deleteResource };
