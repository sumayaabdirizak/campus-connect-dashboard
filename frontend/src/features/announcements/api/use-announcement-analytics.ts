'use client';

import { useQuery } from '@/lib/async-query';
import { apiClient } from '@/lib/api-client';
import type { AnnouncementAnalyticsPayload } from '@/features/announcements/api/types';

export function useAnnouncementAnalytics(announcementId: number | null, open: boolean) {
  return useQuery({
    queryKey: ['announcements', 'analytics', announcementId],
    queryFn: () => apiClient<AnnouncementAnalyticsPayload>(`/announcements/${announcementId}/analytics`),
    enabled: open && announcementId != null && Number.isFinite(announcementId),
    refetchInterval: open ? 30_000 : false,
    staleTime: 15_000
  });
}

export type AckRow = {
  userId: number;
  full_name: string;
  email: string;
  number: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
};

export type AckListPayload = {
  total?: number;
  totalCount?: number;
  page: number;
  pageSize: number;
  results: AckRow[];
};

export function useAnnouncementAcknowledgements(
  announcementId: number | null,
  open: boolean,
  opts: { page: number; pageSize: number; filter: 'all' | 'acked' | 'pending' }
) {
  const q = new URLSearchParams({
    page: String(opts.page),
    pageSize: String(opts.pageSize),
    filter: opts.filter,
    format: 'json'
  });
  return useQuery({
    queryKey: ['announcements', 'acknowledgements', announcementId, opts.page, opts.pageSize, opts.filter],
    queryFn: () =>
      apiClient<AckListPayload>(`/announcements/${announcementId}/acknowledgements?${q.toString()}`),
    enabled: open && announcementId != null && Number.isFinite(announcementId),
    staleTime: 20_000
  });
}
