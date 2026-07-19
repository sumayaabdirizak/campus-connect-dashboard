import type { ClubListParams } from './service';

export const clubKeys = {
  all: ['clubs'] as const,
  list: (params?: ClubListParams) => [...clubKeys.all, 'list', params ?? {}] as const,
  mine: () => [...clubKeys.all, 'mine'] as const,
  recommended: (limit?: number) => [...clubKeys.all, 'recommended', limit] as const,
  detail: (slug: string) => [...clubKeys.all, 'detail', slug] as const,
  pending: () => [...clubKeys.all, 'pending'] as const,
  allFaculty: (status?: string) => [...clubKeys.all, 'dean-all', status ?? 'ALL'] as const,
  members: (clubId: number) => [...clubKeys.all, 'members', clubId] as const,
  requests: (clubId: number) => [...clubKeys.all, 'requests', clubId] as const,
  invites: (clubId: number) => [...clubKeys.all, 'invites', clubId] as const,
  invitePreview: (token: string) => [...clubKeys.all, 'invite-preview', token] as const,
  interestTags: () => [...clubKeys.all, 'interest-tags'] as const,
  myInterests: () => [...clubKeys.all, 'my-interests'] as const,
};
