'use client';

import { useCallback, useEffect, type MutableRefObject } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@/lib/async-query';
import { createAnnouncement, updateAnnouncement } from '@/lib/announcements/services';
import type { Announcement, CreateAnnouncementDTO } from '@/lib/announcements/types';
import type { ImageFile } from './types';
import { htmlToPlain } from './utils';

type Args = {
  open: boolean;
  canPublish: boolean;
  isSubmitting: boolean;
  isEditMode: boolean;
  editingAnnouncement: Announcement | null | undefined;
  canPersistDraftCreate: () => boolean;
  buildDraftJson: () => CreateAnnouncementDTO;
  buildDraftForm: () => FormData;
  images: ImageFile[];
  autosaveDebounceRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  composerRemoteIdRef: MutableRefObject<number | null>;
  /** Changes whenever form fields that should trigger autosave change. */
  formFingerprint: string;
};

export function useDraftAutosave(args: Args) {
  const queryClient = useQueryClient();
  const {
    open,
    canPublish,
    isSubmitting,
    isEditMode,
    editingAnnouncement,
    canPersistDraftCreate,
    buildDraftJson,
    buildDraftForm,
    images,
    autosaveDebounceRef,
    composerRemoteIdRef,
    formFingerprint,
  } = args;

  const getRemoteDraftId = useCallback((): number | null => {
    if (isEditMode && editingAnnouncement?.status === 'DRAFT') {
      const id = Number(editingAnnouncement.id);
      return Number.isFinite(id) ? id : null;
    }
    return composerRemoteIdRef.current;
  }, [isEditMode, editingAnnouncement, composerRemoteIdRef]);

  const persistDraftNow = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!open || !canPublish || isSubmitting) return;
      if (isEditMode && editingAnnouncement?.status !== 'DRAFT') return;

      const showError = (err: unknown) => {
        if (opts?.silent) return;
        const msg = err instanceof Error ? err.message : 'Could not save draft';
        toast.error(msg, {
          description: 'Your changes may not be saved yet.',
          action: { label: 'Retry', onClick: () => void persistDraftNow({ silent: false }) },
        });
      };

      try {
        let remoteId = getRemoteDraftId();
        // Create and update both require a valid draft payload — otherwise PATCH
        // sends e.g. targetRoles: [] and the API returns "Validation failed".
        if (!canPersistDraftCreate()) return;
        if (!remoteId) {
          const created = images.some((img) => Boolean(img.file))
            ? await createAnnouncement(buildDraftForm())
            : await createAnnouncement(buildDraftJson());
          remoteId = Number(created.id);
          if (!Number.isFinite(remoteId)) return;
          composerRemoteIdRef.current = remoteId;
        } else {
          await updateAnnouncement(remoteId, buildDraftJson());
        }
        void queryClient.invalidateQueries({ queryKey: ['announcements'] });
      } catch (e) {
        showError(e);
        throw e;
      }
    },
    [
      open,
      canPublish,
      isSubmitting,
      isEditMode,
      editingAnnouncement?.status,
      getRemoteDraftId,
      canPersistDraftCreate,
      images,
      buildDraftForm,
      buildDraftJson,
      queryClient,
      composerRemoteIdRef,
    ],
  );

  const flushAutosave = useCallback(async () => {
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
      autosaveDebounceRef.current = null;
    }
    try {
      await persistDraftNow({ silent: true });
    } catch {
      toast.error('Could not save draft before closing', {
        action: { label: 'Retry', onClick: () => void persistDraftNow({ silent: false }) },
      });
    }
  }, [persistDraftNow, autosaveDebounceRef]);

  const autosaveActive =
    open &&
    canPublish &&
    (Boolean(isEditMode && editingAnnouncement?.status === 'DRAFT') || !isEditMode);

  useEffect(() => {
    if (!open) {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
        autosaveDebounceRef.current = null;
      }
      composerRemoteIdRef.current = null;
    }
  }, [open, autosaveDebounceRef, composerRemoteIdRef]);

  useEffect(() => {
    if (!autosaveActive) return;
    if (autosaveDebounceRef.current) clearTimeout(autosaveDebounceRef.current);
    autosaveDebounceRef.current = setTimeout(() => {
      autosaveDebounceRef.current = null;
      void persistDraftNow({ silent: true }).catch((err: unknown) => {
        toast.error('Autosave failed', {
          description: err instanceof Error ? err.message : undefined,
          action: { label: 'Retry', onClick: () => void persistDraftNow({ silent: false }) },
        });
      });
    }, 500);
    return () => {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
        autosaveDebounceRef.current = null;
      }
    };
  }, [autosaveActive, formFingerprint, persistDraftNow, autosaveDebounceRef]);

  return { persistDraftNow, flushAutosave };
}

export function canPersistDraftContent(title: string, content: string) {
  const plain = htmlToPlain(content);
  return Boolean(title.trim() && plain && plain.length <= 3000);
}
