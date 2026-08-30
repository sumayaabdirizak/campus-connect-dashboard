'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  useAnnouncements,
  useAnnouncementDraftsCount,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useMarkAsRead,
  useAnnouncementUnreadCount,
  useToggleAnnouncementPin,
  useUpdateAnnouncement
} from '@/lib/announcements/queries';
import { CreateDialog } from './create-dialog';
import { AnnouncementFeed } from './announcement-feed';
import { AnnouncementAnalyticsSheet } from './announcement-analytics-sheet';
import type { Announcement, CreateAnnouncementDTO } from '@/lib/announcements/types';
import { getAnnouncementById } from '@/lib/announcements/services';
import { confirmDelete, handleApiError } from '@/lib/notifications';
import { toast } from 'sonner';

export function AnnouncementsView() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const canManageAnnouncements = user?.role === 'DEAN' || user?.role === 'SUPER_ADMIN';
  const listTab = searchParams?.get('tab') ?? '';
  const draftsTab = Boolean(canManageAnnouncements) && listTab === 'drafts';
  const audienceRoleFromUrl = useMemo(() => {
    const raw = (searchParams?.get('role') ?? 'ALL').trim().toUpperCase();
    if (!raw || raw === 'ALL') return 'ALL';
    const allowed = new Set(['STUDENT', 'TEACHER', 'DEAN', 'SUPER_ADMIN']);
    return allowed.has(raw) ? raw : 'ALL';
  }, [searchParams]);
  const { data: announcements = [], isLoading, error, refetch } = useAnnouncements({
    drafts: draftsTab,
    audienceRole: audienceRoleFromUrl
  });
  const { data: unreadData } = useAnnouncementUnreadCount();
  const { data: draftsCountPayload } = useAnnouncementDraftsCount({
    enabled: canManageAnnouncements
  });
  const draftCount = draftsCountPayload?.count ?? 0;
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const togglePinMutation = useToggleAnnouncementPin();
  const markAsReadMutation = useMarkAsRead();

  const sourceAnnouncements = announcements;
  const unreadCount = unreadData?.unreadCount ?? 0;

  const [createOpen, setCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [analyticsAnnouncement, setAnalyticsAnnouncement] = useState<Announcement | null>(null);

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setCreateOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setCreateOpen(true);
  };

  const handleResumeDraft = useCallback(async (id: number) => {
    try {
      const full = await getAnnouncementById(id);
      setEditingAnnouncement(full);
      setCreateOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load draft';
      toast.error(msg);
    }
  }, []);

  const handleDeleteAnnouncement = async (announcement: Announcement) => {
    if (!(await confirmDelete(announcement.title || 'this announcement'))) return;
    try {
      await deleteMutation.mutateAsync(Number(announcement.id));
    } catch {
      // Error toast is already handled in mutation onError.
    }
  };

  const handleTogglePinAnnouncement = async (announcement: Announcement) => {
    try {
      await togglePinMutation.mutateAsync(Number(announcement.id));
    } catch {
      // Error toast is already handled in mutation onError.
    }
  };

  const handleSubmitAnnouncement = async (data: CreateAnnouncementDTO | FormData) => {
    if (editingAnnouncement) {
      if (data instanceof FormData) {
        toast.error('Edit expects JSON payload');
        return;
      }
      await updateMutation.mutateAsync({ id: Number(editingAnnouncement.id), data });
      setEditingAnnouncement(null);
      return;
    }
    await createMutation.mutateAsync(data as any);
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden bg-muted p-3 sm:p-4'>
      <div className='mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden'>
        <AnnouncementFeed
          announcements={sourceAnnouncements}
          isLoading={isLoading}
          error={error as Error | null}
          onRetry={() => refetch()}
          userRole={user?.role}
          unreadCount={unreadCount}
          draftCount={draftCount}
          canCreate={canManageAnnouncements}
          canManage={canManageAnnouncements}
          onOpenCreate={handleOpenCreate}
          onEditAnnouncement={handleEditAnnouncement}
          onResumeDraft={canManageAnnouncements ? handleResumeDraft : undefined}
          onOpenAnalytics={canManageAnnouncements ? (a) => setAnalyticsAnnouncement(a) : undefined}
          onDeleteAnnouncement={handleDeleteAnnouncement}
          onTogglePinAnnouncement={handleTogglePinAnnouncement}
          onMarkAsRead={markAsReadMutation.mutateAsync}
        />
      </div>

      <AnnouncementAnalyticsSheet
        announcement={analyticsAnnouncement}
        open={analyticsAnnouncement != null}
        onOpenChange={(open) => {
          if (!open) setAnalyticsAnnouncement(null);
        }}
      />

      <CreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setEditingAnnouncement(null);
        }}
        onSubmit={handleSubmitAnnouncement}
        editingAnnouncement={editingAnnouncement}
      />
    </div>
  );
}
