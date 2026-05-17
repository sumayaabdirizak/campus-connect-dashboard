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
} from '../api/queries';
import { setAnnouncementSocketDiagnosticsRef } from '../api/use-announcement-socket';
import {
  isAnnouncementDiagnosticsEnabled,
  useAnnouncementDiagnostics
} from '../diagnostics/use-announcement-diagnostics';
import { CreateDialog } from './create-dialog';
import { AnnouncementFeed } from './announcement-feed';
import { AnnouncementAnalyticsSheet } from './announcement-analytics-sheet';
import type { Announcement, CreateAnnouncementDTO } from '../api/types';
import { getAnnouncementById } from '../api/service';
import { toast } from 'sonner';

export function AnnouncementsView() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const diagnosticEnabled = useMemo(() => isAnnouncementDiagnosticsEnabled(), []);
  const canManageAnnouncements = user?.role === 'DEAN' || user?.role === 'SUPER_ADMIN';
  const listTab = searchParams?.get('tab') ?? '';
  const scheduledTab =
    Boolean(canManageAnnouncements) && listTab === 'scheduled';
  const draftsTab = Boolean(canManageAnnouncements) && listTab === 'drafts';
  const audienceRoleFromUrl = useMemo(() => {
    const raw = (searchParams?.get('role') ?? 'ALL').trim().toUpperCase();
    if (!raw || raw === 'ALL') return 'ALL';
    const allowed = new Set(['STUDENT', 'TEACHER', 'DEAN', 'SUPER_ADMIN']);
    return allowed.has(raw) ? raw : 'ALL';
  }, [searchParams]);
  const { data: announcements = [], isLoading, error, refetch } = useAnnouncements({
    scheduled: scheduledTab,
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

  const diagnostics = useAnnouncementDiagnostics({
    enabled: diagnosticEnabled,
    announcements,
    isLoading,
    error: error as Error | null,
    userRole: user?.role
  });

  useEffect(() => {
    setAnnouncementSocketDiagnosticsRef(diagnostics.socketDiagnostics);
    return () => setAnnouncementSocketDiagnosticsRef(undefined);
  }, [diagnostics.socketDiagnostics]);

  const sourceAnnouncements = diagnosticEnabled ? diagnostics.safeAnnouncements : announcements;
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
    if (!window.confirm('Delete this announcement?')) return;
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

  const handleCancelSchedule = async (announcement: Announcement) => {
    try {
      /** Product choice: cancel = return to draft (not ARCHIVED) so the composer can reuse content. */
      await updateMutation.mutateAsync({
        id: Number(announcement.id),
        data: { status: 'DRAFT', publishedAt: null },
        successToast: 'Schedule cancelled'
      });
    } catch {
      // Error toast is already handled in mutation onError.
    }
  };

  const handleReschedulePublishAt = async (announcement: Announcement, publishedAtIso: string) => {
    try {
      await updateMutation.mutateAsync({
        id: Number(announcement.id),
        data: { publishedAt: publishedAtIso },
        successToast: 'Publish time updated'
      });
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
    <div className='flex h-full min-h-0 flex-1 flex-col bg-muted/25 dark:bg-muted/10'>
      <div className='flex min-h-0 w-full flex-1 flex-col'>
        {diagnosticEnabled && (
          <div className='mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950'>
            Announcement diagnostics active (
            <code className='text-xs'>NEXT_PUBLIC_ANNOUNCEMENT_DIAGNOSTIC=true</code> or{' '}
            <code className='text-xs'>?announcementDiag=1</code>). Open the console for checks. Use{' '}
            <code className='text-xs'>window.__ANNOUNCEMENT_DIAG__</code> for API/socket simulations
            and <code className='text-xs'>printReport()</code>.
          </div>
        )}
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
          onCancelSchedule={canManageAnnouncements ? handleCancelSchedule : undefined}
          onReschedulePublishAt={
            canManageAnnouncements ? handleReschedulePublishAt : undefined
          }
          onMarkAsRead={markAsReadMutation.mutateAsync}
          readTrigger={diagnosticEnabled ? 'click' : 'viewport'}
          onSnapshotUnreadBeforeRead={
            diagnosticEnabled ? diagnostics.snapshotUnreadBeforeRead : undefined
          }
          onReadDiagnostic={diagnosticEnabled ? diagnostics.onReadDiagnostic : undefined}
          onLightboxDiagnostic={diagnosticEnabled ? diagnostics.onLightboxDiagnostic : undefined}
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
