'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { uploadDiscussionFile } from '@/lib/discussions/services/discussion-upload';
import type { PendingAttachment } from './types';

export function useComposerAttachments(opts: {
  channelId: string;
  canAttachFiles: boolean;
  e2eeEnabled?: boolean;
  e2eeKeyVersion?: number;
}) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!opts.canAttachFiles) {
      toast.error("You don't have permission to attach files in this channel");
      return;
    }
    Array.from(files).forEach((file) => {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const upload = uploadDiscussionFile({
        file,
        channelId: opts.channelId,
        keyVersion: opts.e2eeKeyVersion ?? 1,
        requireE2eeMetadata: !!opts.e2eeEnabled,
        onProgress: (percent) => {
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, progress: percent } : a))
          );
        }
      });
      setAttachments((prev) => [
        ...prev,
        { localId, file, progress: 0, result: null, error: null, abort: upload.abort }
      ]);
      void upload.promise
        .then((result) => {
          setAttachments((prev) =>
            prev.map((a) =>
              a.localId === localId ? { ...a, result, progress: 100 } : a
            )
          );
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, error: msg } : a))
          );
          toast.error(`Upload failed: ${file.name}`, { description: msg });
        });
    });
  };

  const removeAttachment = (localId: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId);
      if (target && !target.result) target.abort();
      return prev.filter((a) => a.localId !== localId);
    });
  };

  const allAttachmentsReady = attachments.every((a) => a.result != null);
  const hasReadyAttachments = attachments.some((a) => a.result != null);

  return {
    attachments,
    setAttachments,
    handleFiles,
    removeAttachment,
    allAttachmentsReady,
    hasReadyAttachments
  };
}
