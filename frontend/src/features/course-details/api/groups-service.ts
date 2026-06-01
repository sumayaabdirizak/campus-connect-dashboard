import type { CourseGroup, GroupMember, GroupMemberRole } from './groups-types';
import { apiClient } from '@/lib/api-client';

async function fetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiClient<T>(endpoint, options);
}

export async function getGroups(courseOfferingId: string): Promise<CourseGroup[]> {
  return fetchWithAuth<CourseGroup[]>(`/groups/${courseOfferingId}`);
}

export async function createGroup(courseOfferingId: string, name: string): Promise<CourseGroup> {
  return fetchWithAuth<CourseGroup>(`/groups/${courseOfferingId}`, {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function renameGroup(groupId: string, name: string): Promise<CourseGroup> {
  return fetchWithAuth<CourseGroup>(`/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name })
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await fetchWithAuth<void>(`/groups/${groupId}`, { method: 'DELETE' });
}

export async function addGroupMember(
  groupId: string,
  studentId: number,
  role: GroupMemberRole = 'MEMBER'
): Promise<GroupMember> {
  return fetchWithAuth<GroupMember>(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ studentId, role })
  });
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  await fetchWithAuth<void>(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
}

export async function setGroupMemberRole(
  groupId: string,
  memberId: string,
  role: GroupMemberRole
): Promise<GroupMember> {
  return fetchWithAuth<GroupMember>(`/groups/${groupId}/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
}
