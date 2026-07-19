'use client';

import { toast } from 'sonner';
import {
  useAddGroupMember,
  useRemoveGroupMember,
  useSetGroupMemberRole,
} from '../../api/groups-queries';
import type { GroupMemberRole } from '../../api/groups-types';

export function useGroupMembers(courseId: string) {
  const addMemberMutation = useAddGroupMember(courseId);
  const removeMemberMutation = useRemoveGroupMember(courseId);
  const setRoleMutation = useSetGroupMemberRole(courseId);

  const handleAddMember = (
    groupId: number,
    memberId: string,
    onDone: () => void
  ) => {
    if (!memberId) return;
    addMemberMutation.mutate(
      { groupId: String(groupId), memberId: Number(memberId) },
      {
        onSuccess: () => {
          toast.success('Member added');
          onDone();
        },
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleRemoveMember = (groupId: number, memberId: number) => {
    removeMemberMutation.mutate(
      { groupId: String(groupId), memberId: String(memberId) },
      {
        onSuccess: () => toast.success('Member removed'),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const handleToggleLeader = (
    groupId: number,
    memberId: number,
    currentRole: GroupMemberRole
  ) => {
    const newRole: GroupMemberRole = currentRole === 'LEADER' ? 'MEMBER' : 'LEADER';
    setRoleMutation.mutate(
      { groupId: String(groupId), memberId: String(memberId), role: newRole },
      {
        onSuccess: () =>
          toast.success(
            newRole === 'LEADER' ? 'Set as group leader' : 'Demoted to member'
          ),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  return {
    addMemberMutation,
    removeMemberMutation,
    setRoleMutation,
    handleAddMember,
    handleRemoveMember,
    handleToggleLeader,
  };
}
