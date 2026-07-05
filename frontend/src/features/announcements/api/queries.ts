import { useMutation, useQuery, useQueryClient } from '@/lib/async-query';
import {
  getAnnouncements,
  createAnnouncement,
  markAnnouncementAsRead,
  deleteAnnouncement,
  getAnnouncementUnreadCount,
  getAnnouncementDraftsCount,
  togglePinAnnouncement,
  updateAnnouncement
} from './service';
import { Announcement, CreateAnnouncementDTO } from './types';
import { handleApiError, showToast } from '@/lib/notifications';

export const useAnnouncements = (opts?: {
  scheduled?: boolean;
  drafts?: boolean;
  audienceRole?: string;
}) => {
  const mode = opts?.scheduled ? 'scheduled' : opts?.drafts ? 'drafts' : 'list';
  const ar = opts?.audienceRole?.trim().toUpperCase();
  const audienceKey = ar && ar !== 'ALL' ? ar : 'ALL';
  return useQuery({
    queryKey: ['announcements', mode, audienceKey],
    queryFn: () => getAnnouncements(opts),
    refetchInterval: 120_000,
    staleTime: 60_000
  });
};

export const useAnnouncementDraftsCount = (opts?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['announcements', 'drafts-count'],
    queryFn: getAnnouncementDraftsCount,
    enabled: Boolean(opts?.enabled),
    refetchInterval: 120_000,
    staleTime: 30_000
  });
};

export const useAnnouncementUnreadCount = () => {
  return useQuery({
    queryKey: ['announcements', 'unread-count'],
    queryFn: getAnnouncementUnreadCount,
    refetchInterval: 120_000,
    staleTime: 60_000
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements', 'unread-count'] });
    }
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
