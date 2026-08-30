import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import type { GroupMemberRole } from '../types';
import {
  getGroups,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  renameGroup,
  setGroupMemberRole
} from '../services/groups-service';
import {
  type LiveQueryOptions,
  withCourseLiveRefresh
} from './live-query-options';

export const groupKeys = {
  all: ['groups'] as const,
  list: (courseOfferingId: string) => [...groupKeys.all, courseOfferingId] as const
};

export function useGroups(courseOfferingId: string, options?: LiveQueryOptions) {
  const live = options?.live ?? false;
  return useQuery({
    queryKey: groupKeys.list(courseOfferingId),
    queryFn: () => getGroups(courseOfferingId),
    ...withCourseLiveRefresh(live)
  });
}

export function useCreateGroup(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name }: { name: string }) => createGroup(courseOfferingId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(courseOfferingId) });
    }
  });
}

export function useRenameGroup(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      renameGroup(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(courseOfferingId) });
    }
  });
}

export function useDeleteGroup(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(courseOfferingId) });
    }
  });
}

export function useAddGroupMember(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      memberId,
      role,
      transfer
    }: {
      groupId: string;
      memberId: number;
      role?: GroupMemberRole;
      transfer?: boolean;
    }) => addGroupMember(groupId, memberId, role, transfer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(courseOfferingId) });
    }
  });
}

export function useRemoveGroupMember(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      removeGroupMember(groupId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(courseOfferingId) });
    }
  });
}

export function useSetGroupMemberRole(courseOfferingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, memberId, role }: { groupId: string; memberId: string; role: GroupMemberRole }) =>
      setGroupMemberRole(groupId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.list(courseOfferingId) });
    }
  });
}
