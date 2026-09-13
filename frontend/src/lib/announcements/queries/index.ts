import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  getAnnouncements,
  createAnnouncement,
  markAnnouncementAsRead,
  deleteAnnouncement,
  getAnnouncementUnreadCount,
  getAnnouncementDraftsCount,
  getAnnouncementPublishedTotal,
  getRecentAnnouncements,
  togglePinAnnouncement,
  updateAnnouncement
} from '../services';
import { Announcement, CreateAnnouncementDTO } from '../types';
import { handleApiError, showToast } from '@/lib/notifications';
import {
  ANNOUNCEMENT_REFETCH_INTERVAL,
  ANNOUNCEMENT_STALE_MS,
} from './query-config';

function markAnnouncementReadInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number
) {
  const markRead = (current: Announcement[] | undefined) =>
    (current ?? []).map((item) =>
      String(item.id) === String(id) ? { ...item, isRead: true } : item
    );
  queryClient.updateQueriesDataByPrefix<Announcement[]>(
    ['announcements', 'list'],
    markRead
  );
  queryClient.updateQueriesDataByPrefix<Announcement[]>(
    ['announcements', 'scheduled'],
    markRead
  );
  queryClient.updateQueriesDataByPrefix<Announcement[]>(
    ['announcements', 'recent'],
    markRead
  );
  queryClient.setQueryData<{ unreadCount: number }>(
    ['announcements', 'unread-count'],
    (old) => ({
      unreadCount: Math.max(0, (old?.unreadCount ?? 0) - 1),
    })
  );
}

export const useAnnouncements = (opts?: {
  scheduled?: boolean;
  drafts?: boolean;
  audienceRole?: string;
  enabled?: boolean;
}) => {
  const mode = opts?.scheduled ? 'scheduled' : opts?.drafts ? 'drafts' : 'list';
  const ar = opts?.audienceRole?.trim().toUpperCase();
  const audienceKey = ar && ar !== 'ALL' ? ar : 'ALL';
  return useQuery({
    queryKey: ['announcements', mode, audienceKey],
    queryFn: () => getAnnouncements(opts),
    enabled: opts?.enabled ?? true,
    staleTime: ANNOUNCEMENT_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });
};

/** Dashboard sidebar — fetches only N recent rows, not the full feed. */
export const useRecentAnnouncements = (
  limit = 5,
  opts?: { enabled?: boolean }
) =>
  useQuery({
    queryKey: ['announcements', 'recent', limit],
    queryFn: () => getRecentAnnouncements(limit),
    enabled: opts?.enabled ?? true,
    staleTime: ANNOUNCEMENT_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });

export const useAnnouncementPublishedTotal = (opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['announcements', 'published-total'],
    queryFn: getAnnouncementPublishedTotal,
    enabled: opts?.enabled ?? true,
    staleTime: ANNOUNCEMENT_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });

export const useAnnouncementDraftsCount = (opts?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['announcements', 'drafts-count'],
    queryFn: getAnnouncementDraftsCount,
    enabled: Boolean(opts?.enabled),
    staleTime: ANNOUNCEMENT_STALE_MS,
    refetchOnWindowFocus: true,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });
};

export const useAnnouncementUnreadCount = () => {
  return useQuery({
    queryKey: ['announcements', 'unread-count'],
    queryFn: getAnnouncementUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: ANNOUNCEMENT_REFETCH_INTERVAL,
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnnouncementDTO | FormData) => createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast('success', 'Announcement posted successfully');
    },
    onError: (error: unknown) => {
      handleApiError(error, 'Failed to post announcement');
    }
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => markAnnouncementAsRead(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['announcements'] });
      markAnnouncementReadInCache(queryClient, id);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', 'unread-count'] });
    },
  });
};

export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['announcements'] });
      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'list'], (current = []) =>
        current.filter((item) => String(item.id) !== String(id))
      );
      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'scheduled'], (current = []) =>
        current.filter((item) => String(item.id) !== String(id))
      );
      queryClient.updateQueriesDataByPrefix<Announcement[]>(['announcements', 'drafts'], (current = []) =>
        current.filter((item) => String(item.id) !== String(id))
      );
    },
    onError: (error: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      handleApiError(error, 'Failed to delete announcement');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast('success', 'Announcement deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });
};

export const useToggleAnnouncementPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => togglePinAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast('success', 'Announcement pin status updated');
    },
    onError: (error: unknown) => {
      handleApiError(error, 'Failed to update pin status');
    }
  });
};

export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      successToast
    }: {
      id: number;
      data: Partial<CreateAnnouncementDTO>;
      /** When set, shown instead of the default "Announcement updated" toast. */
      successToast?: string;
    }) => updateAnnouncement(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      showToast('success', variables.successToast ?? 'Announcement updated');
    },
    onError: (error: unknown) => {
      handleApiError(error, 'Failed to update announcement');
    }
  });
};
