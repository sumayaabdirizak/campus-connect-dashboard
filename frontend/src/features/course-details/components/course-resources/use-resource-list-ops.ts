'use client';

import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';
import { deleteResource as deleteResourceCall } from '../../api/resources-service';
import {
  resourceKeys,
  useDeleteModule,
  useDeleteResource,
  useReorderModules,
  useReorderResources,
} from '../../api/resources-queries';
import type { CourseModule, Resource } from '../../api/resources-types';
import {
  moduleReorderPayload,
  patchModuleOrder,
  patchResourceOrder,
} from './reorder-cache';

export function useResourceListOps(courseId: string) {
  const deleteResourceMutation = useDeleteResource(courseId);
  const deleteModuleMutation = useDeleteModule(courseId);
  const reorderResourcesMutation = useReorderResources(courseId);
  const reorderModulesMutation = useReorderModules(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const handleDeleteResource = (id: number) => {
    const key = resourceKeys.list(courseId);
    const snapshot = queryClient.getQueryData<Resource[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((r) => r.id === id);
    if (!removed) return;
    runDelete({
      label: `Material deleted · "${removed.title}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<Resource[]>(key, (prev) =>
          (prev ?? []).filter((r) => r.id !== id)
        );
      },
      restore: () => queryClient.setQueryData<Resource[]>(key, () => snapshot),
      commit: () => deleteResourceCall(String(id)),
    });
  };

  const handleDeleteModule = (id: number) => {
    deleteModuleMutation.mutate(id, {
      onSuccess: () => toast.success('Module deleted'),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleReorderResources = (
    items: { id: number; moduleId: number | null; position: number }[]
  ) => {
    queryClient.setQueryData<Resource[]>(resourceKeys.list(courseId), (prev) =>
      patchResourceOrder(prev, items)
    );
    reorderResourcesMutation.mutate(items, {
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleReorderModules = (orderedIds: number[]) => {
    queryClient.setQueryData<CourseModule[]>(
      resourceKeys.modules(courseId),
      (prev) => patchModuleOrder(prev, orderedIds)
    );
    reorderModulesMutation.mutate(moduleReorderPayload(orderedIds), {
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return {
    deleteResourceMutation,
    deleteModuleMutation,
    handleDeleteResource,
    handleDeleteModule,
    handleReorderResources,
    handleReorderModules,
  };
}
