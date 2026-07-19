import { apiClient } from '@/lib/api-client';
import type {
  CreateGroupDmPayload,
  DiscussionMessage,
  GroupDmCandidatesResponse,
  GroupDmDetailResponse,
  GroupDmListResponse,
  GroupDmMessagesResponse,
} from './types';

export const listGroupDms = () => apiClient<GroupDmListResponse>('/discussions/group-dms');

export const getGroupDm = (groupDmId: number) =>
  apiClient<GroupDmDetailResponse>(`/discussions/group-dms/${groupDmId}`);

export const createGroupDm = (body: CreateGroupDmPayload) =>
  apiClient<{ groupDm: GroupDmDetailResponse['groupDm'] }>('/discussions/group-dms', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const listGroupDmMessages = (
  groupDmId: number,
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
  groupDmId: number,
  body: {
    content?: string | null;
    messageType?: 'TEXT' | 'MEDIA' | 'SYSTEM';
    parentMessageId?: number | null;
  }
) =>
  apiClient<{ message: DiscussionMessage }>(`/discussions/group-dms/${groupDmId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const addGroupDmMembers = (groupDmId: number, userIds: number[]) =>
  apiClient<{ groupDm: GroupDmDetailResponse['groupDm'] }>(
    `/discussions/group-dms/${groupDmId}/members`,
    { method: 'POST', body: JSON.stringify({ userIds }) }
  );

export const removeGroupDmMember = (groupDmId: number, targetUserId: number) =>
  apiClient<{ ok: true }>(`/discussions/group-dms/${groupDmId}/members/${targetUserId}`, {
    method: 'DELETE',
  });

export const leaveGroupDm = (groupDmId: number) =>
  apiClient<{ ok: true; archived: boolean; newOwnerId: number | null }>(
    `/discussions/group-dms/${groupDmId}/leave`,
    { method: 'POST', body: JSON.stringify({}) }
  );

export type GroupDmReceipt = {
  userId: number;
  messageId: number;
  readAt: string;
};

export const getGroupDmReceipts = (groupDmId: number) =>
  apiClient<{ results: GroupDmReceipt[] }>(`/discussions/group-dms/${groupDmId}/receipts`);

export const searchGroupDmCandidates = (q?: string) => {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return apiClient<GroupDmCandidatesResponse>(`/discussions/group-dms/member-candidates${query}`);
};
