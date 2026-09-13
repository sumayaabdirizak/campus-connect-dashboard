import { apiClient } from '@/lib/api-client';
import { uploadJson } from '@/lib/upload-client';
import type {
  CreateGroupDmPayload,
  DiscussionMessage,
  GroupDmCandidatesResponse,
  GroupDmDetailResponse,
  GroupDmListResponse,
  GroupDmMessagesResponse,
} from '@/lib/discussions/queries/types';

export const listGroupDms = () => apiClient<GroupDmListResponse>('/discussions/group-dms');

export const getGroupDm = (groupDmId: string) =>
  apiClient<GroupDmDetailResponse>(`/discussions/group-dms/${groupDmId}`);

export const createGroupDm = (body: CreateGroupDmPayload) =>
  apiClient<{ groupDm: GroupDmDetailResponse['groupDm'] }>('/discussions/group-dms', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const listGroupDmMessages = (
  groupDmId: string,
  params: { limit?: number; cursor?: string | null } = {}
) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.cursor) qs.set('cursor', params.cursor);
  const query = qs.toString();
  return apiClient<GroupDmMessagesResponse>(
    `/discussions/group-dms/${groupDmId}/messages${query ? `?${query}` : ''}`
  );
};

export const sendGroupDmMessage = (
  groupDmId: string,
  body: {
    content?: string | null;
    messageType?: 'TEXT' | 'MEDIA' | 'SYSTEM';
    parentMessageId?: string | null;
    replyToMessageId?: string | null;
    attachmentIds?: string[];
  }
) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/group-dms/${groupDmId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const uploadGroupDmIcon = (groupDmId: string, file: File) => {
  const form = new FormData();
  form.append('icon', file);
  return uploadJson<{ groupDm: { id: string; iconUrl: string | null } }>(
    `/discussions/group-dms/${groupDmId}/icon`,
    form
  );
};

export const removeGroupDmIcon = (groupDmId: string) =>
  apiClient<{ groupDm: { id: string; iconUrl: string | null } }>(
    `/discussions/group-dms/${groupDmId}/icon`,
    { method: 'DELETE' }
  );

export const renameGroupDm = (groupDmId: string, name: string | null) =>
  apiClient<{ groupDm: { id: string; name: string | null } }>(
    `/discussions/group-dms/${groupDmId}`,
    { method: 'PATCH', body: JSON.stringify({ name }) }
  );

export const addGroupDmMembers = (groupDmId: string, userIds: number[]) =>
  apiClient<{ groupDm: GroupDmDetailResponse['groupDm'] }>(
    `/discussions/group-dms/${groupDmId}/members`,
    { method: 'POST', body: JSON.stringify({ userIds }) }
  );

export const setGroupDmMemberCanPost = (
  groupDmId: string,
  targetUserId: number,
  canPost: boolean
) =>
  apiClient<{ member: { userId: number; canPost: boolean } }>(
    `/discussions/group-dms/${groupDmId}/members/${targetUserId}/permissions`,
    { method: 'PATCH', body: JSON.stringify({ canPost }) }
  );

export const removeGroupDmMember = (groupDmId: string, targetUserId: number) =>
  apiClient<{ ok: true }>(`/discussions/group-dms/${groupDmId}/members/${targetUserId}`, {
    method: 'DELETE',
  });

export const leaveGroupDm = (groupDmId: string) =>
  apiClient<{ ok: true; archived: boolean; newOwnerId: number | null }>(
    `/discussions/group-dms/${groupDmId}/leave`,
    { method: 'POST', body: JSON.stringify({}) }
  );

export type GroupDmReceipt = {
  userId: number;
  messageId: string;
  readAt: string;
};

export const getGroupDmReceipts = (groupDmId: string) =>
  apiClient<{ results: GroupDmReceipt[] }>(`/discussions/group-dms/${groupDmId}/receipts`);

export const searchGroupDmCandidates = (
  q?: string,
  purpose: 'direct' | 'group' = 'direct'
) => {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (purpose === 'group') qs.set('purpose', 'group');
  const query = qs.toString();
  return apiClient<GroupDmCandidatesResponse>(
    `/discussions/group-dms/member-candidates${query ? `?${query}` : ''}`
  );
};
