import { useMutation, useQueryClient } from '@/lib/async-query';
import { toast } from 'sonner';
import { discussionKeys } from '@/lib/discussions/queries/discussion-keys';
import {
  addGroupDmMembers,
  createGroupDm,
  leaveGroupDm,
  removeGroupDmIcon,
  removeGroupDmMember,
  renameGroupDm,
  sendGroupDmMessage,
  setGroupDmMemberCanPost,
  uploadGroupDmIcon
} from '@/lib/discussions/queries/service';
import type { CreateGroupDmPayload } from '@/lib/discussions/queries/types';
import { inboxKeys } from '@/lib/inbox/queries';

function invalidateGroupDmAndInbox(qc: ReturnType<typeof useQueryClient>, groupDmId?: string) {
  if (groupDmId) qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
  qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
  qc.invalidateQueries({ queryKey: inboxKeys.all });
}

export const useCreateGroupDm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGroupDmPayload) => createGroupDm(body),
    onSuccess: () => {
      invalidateGroupDmAndInbox(qc);
    },
    onError: (error: Error) => {
      toast.error('Failed to create group DM', { description: error.message });
    }
  });
};

export const useSendGroupDmMessage = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      content?: string | null;
      messageType?: 'TEXT' | 'MEDIA' | 'SYSTEM';
      parentMessageId?: string | null;
    }) => sendGroupDmMessage(groupDmId, body),
    onSuccess: () => {
      invalidateGroupDmAndInbox(qc, groupDmId);
    },
    onError: (error: Error) => {
      toast.error('Failed to send message', { description: error.message });
    }
  });
};

export const useAddGroupDmMembers = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: number[]) => addGroupDmMembers(groupDmId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    }
  });
};

export const useRenameGroupDm = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string | null) => renameGroupDm(groupDmId, name),
    onSuccess: () => {
      invalidateGroupDmAndInbox(qc, groupDmId);
    },
    onError: (error: Error) => {
      toast.error('Failed to rename conversation', { description: error.message });
    }
  });
};

export const useUploadGroupDmIcon = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadGroupDmIcon(groupDmId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    },
    onError: (error: Error) => {
      toast.error('Failed to update icon', { description: error.message });
    }
  });
};

export const useRemoveGroupDmIcon = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => removeGroupDmIcon(groupDmId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
      qc.invalidateQueries({ queryKey: discussionKeys.groupDms() });
    },
    onError: (error: Error) => {
      toast.error('Failed to remove icon', { description: error.message });
    }
  });
};

export const useSetGroupDmMemberCanPost = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { targetUserId: number; canPost: boolean }) =>
      setGroupDmMemberCanPost(groupDmId, args.targetUserId, args.canPost),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.groupDm(groupDmId) });
    },
    onError: (error: Error) => {
      toast.error('Failed to update permission', { description: error.message });
    }
  });
};

export const useRemoveGroupDmMember = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: number) => removeGroupDmMember(groupDmId, targetUserId),
    onSuccess: () => {
      invalidateGroupDmAndInbox(qc, groupDmId);
    }
  });
};

// Self-leave (B2). Returns `{ ok, archived, newOwnerId }` from the server so
// the caller can decide whether to surface "you are the new owner" / "the DM
// was archived" feedback. Invalidates the DM detail and list so any stale
// member rows / sidebar entries refresh.
export const useLeaveGroupDm = (groupDmId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => leaveGroupDm(groupDmId),
    onSuccess: () => {
      invalidateGroupDmAndInbox(qc, groupDmId);
    }
  });
};
