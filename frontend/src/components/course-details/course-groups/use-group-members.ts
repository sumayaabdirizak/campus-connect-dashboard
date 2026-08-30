'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import {
  groupKeys,
  useAddGroupMember,
  useRemoveGroupMember,
  useSetGroupMemberRole
} from '@/lib/course-details/queries/groups-queries';
import { addGroupMember } from '@/lib/course-details/services/groups-service';
import type { GroupMemberRole } from '@/lib/course-details/services/groups-types';

export function useGroupMembers(courseId: string) {
  const queryClient = useQueryClient();
  const addMemberMutation = useAddGroupMember(courseId);
  const removeMemberMutation = useRemoveGroupMember(courseId);
  const setRoleMutation = useSetGroupMemberRole(courseId);
  const [bulkAdding, setBulkAdding] = useState(false);

  const handleAddMembers = async (
    groupId: number,
    memberIds: number[],
    onDone: () => void
  ) => {
    if (memberIds.length === 0) return;
    setBulkAdding(true);
    let added = 0;
    let failed = 0;
    try {
      for (const memberId of memberIds) {
        try {
          await addGroupMember(String(groupId), memberId);
          added += 1;
        } catch {
          failed += 1;
        }
      }
      await queryClient.invalidateQueries({ queryKey: groupKeys.list(courseId) });
      if (added > 0 && failed === 0) {
        toast.success(added === 1 ? 'Student added' : `${added} students added`);
        onDone();
      } else if (added > 0) {
        toast.warning(`Added ${added}, could not add ${failed}`);
        onDone();
      } else {
        toast.error('Could not add students');
      }
    } finally {
      setBulkAdding(false);
    }
  };

  const handleRemoveMember = (groupId: number, memberId: number) => {
    removeMemberMutation.mutate(
      { groupId: String(groupId), memberId: String(memberId) },
      {
        onSuccess: () => toast.success('Member removed'),
        onError: (e: Error) => toast.error(e.message)
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
        onError: (e: Error) => toast.error(e.message)
      }
    );
  };

  return {
    addMemberMutation,
    removeMemberMutation,
    setRoleMutation,
    bulkAdding,
    handleAddMembers,
    handleRemoveMember,
    handleToggleLeader
  };
}
