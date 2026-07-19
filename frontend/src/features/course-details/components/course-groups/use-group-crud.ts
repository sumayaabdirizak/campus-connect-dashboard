'use client';

import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { useDeleteWithUndo } from '../_shared/use-delete-with-undo';
import { deleteGroup as deleteGroupCall } from '../../api/groups-service';
import {
  groupKeys,
  useCreateGroup,
  useDeleteGroup,
  useRenameGroup,
} from '../../api/groups-queries';
import type { CourseGroup } from '../../api/groups-types';
import type { StudyGroupFormValues } from '../../schemas/study-group';

export function useGroupCrud(courseId: string) {
  const createMutation = useCreateGroup(courseId);
  const deleteMutation = useDeleteGroup(courseId);
  const renameMutation = useRenameGroup(courseId);
  const queryClient = useQueryClient();
  const { run: runDelete } = useDeleteWithUndo();

  const handleCreate = (values: StudyGroupFormValues, onDone: () => void) => {
    createMutation.mutate(
      { name: values.name },
      {
        onSuccess: () => {
          toast.success('Group created');
          onDone();
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (id: number) => {
    const key = groupKeys.list(courseId);
    const snapshot = queryClient.getQueryData<CourseGroup[]>(key);
    if (!snapshot) return;
    const removed = snapshot.find((g) => g.id === id);
    if (!removed) return;
    runDelete({
      label: `Group deleted · "${removed.name}"`,
      optimisticallyRemove: () => {
        queryClient.setQueryData<CourseGroup[]>(key, (prev) =>
          (prev ?? []).filter((g) => g.id !== id)
        );
      },
      restore: () => queryClient.setQueryData<CourseGroup[]>(key, () => snapshot),
      commit: () => deleteGroupCall(String(id)),
    });
  };

  const handleRename = (groupId: number, name: string, onDone: () => void) => {
    if (!name.trim()) return;
    renameMutation.mutate(
      { groupId: String(groupId), name: name.trim() },
      {
        onSuccess: () => {
          toast.success('Group renamed');
          onDone();
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  return {
    createMutation,
    deleteMutation,
    handleCreate,
    handleDelete,
    handleRename,
  };
}
