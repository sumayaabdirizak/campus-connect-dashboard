'use client';

import { toast } from 'sonner';
import {
  useCreateModule,
  useCreateResource,
  useUpdateModule,
  useUpdateResource
} from '@/lib/course-details/queries/resources-queries';
import type { ModuleSubmitPayload, ResourceSubmitPayload } from './submit-types';

export function useResourceCrud(courseId: string, teacherId: number) {
  const createResourceMutation = useCreateResource(courseId);
  const updateResourceMutation = useUpdateResource(courseId);
  const createModuleMutation = useCreateModule(courseId);
  const updateModuleMutation = useUpdateModule(courseId);

  const handleResourceSubmit = (
    payload: ResourceSubmitPayload,
    onDone: () => void
  ) => {
    if (payload.mode === 'create') {
      if (!teacherId) {
        toast.error('You must be signed in to add materials');
        return;
      }
      createResourceMutation.mutate(
        { ...payload.data, teacherId },
        {
          onSuccess: () => {
            onDone();
            toast.success('Material added');
          },
          onError: (err: Error) => toast.error(err.message)
        }
      );
      return;
    }
    updateResourceMutation.mutate(
      { resourceId: payload.resourceId, data: payload.data },
      {
        onSuccess: () => {
          onDone();
          toast.success('Material updated');
        },
        onError: (err: Error) => toast.error(err.message)
      }
    );
  };

  const handleModuleSubmit = (payload: ModuleSubmitPayload, onDone: () => void) => {
    if (payload.mode === 'create') {
      createModuleMutation.mutate(payload.data, {
        onSuccess: () => {
          onDone();
          toast.success('Module added');
        },
        onError: (err: Error) => toast.error(err.message)
      });
      return;
    }
    updateModuleMutation.mutate(
      { moduleId: payload.moduleId, data: payload.data },
      {
        onSuccess: () => {
          onDone();
          toast.success('Module updated');
        },
        onError: (err: Error) => toast.error(err.message)
      }
    );
  };

  return {
    createResourceMutation,
    updateResourceMutation,
    createModuleMutation,
    updateModuleMutation,
    handleResourceSubmit,
    handleModuleSubmit
  };
}
