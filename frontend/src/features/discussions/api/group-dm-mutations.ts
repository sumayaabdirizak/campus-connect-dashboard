import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from './discussion-keys';
import {
  addGroupDmMembers,
  createGroupDm,
  leaveGroupDm,
  removeGroupDmMember,
  sendGroupDmMessage
} from './service';
import type { CreateGroupDmPayload } from './types';

export const useCreateGroupDm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupDmPayload) => createGroupDm(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    },
    onError: (error: Error) => {
      toast.error('Failed to create group DM', { description: error.message });
    }
  });
};

export const useSendGroupDmMessage = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      content?: string | null;
      messageType?: 'TEXT' | 'MEDIA' | 'SYSTEM';
      parentMessageId?: number | null;
    }) => sendGroupDmMessage(groupDmId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', { description: error.message });
    }
  });
};

export const useAddGroupDmMembers = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: number[]) => addGroupDmMembers(groupDmId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    }
  });
};

export const useRemoveGroupDmMember = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => removeGroupDmMember(groupDmId, targetUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    }
  });
};

// Self-leave (B2). Returns `{ ok, archived, newOwnerId }` from the server so
// the caller can decide whether to surface "you are the new owner" / "the DM
// was archived" feedback. Invalidates the DM detail and list so any stale
// member rows / sidebar entries refresh.
export const useLeaveGroupDm = (groupDmId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroupDm(groupDmId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    }
  });
};
