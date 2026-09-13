'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { uploadDiscussionFile } from '@/lib/discussions/services/discussion-upload'
import type { PendingAttachment } from '@/components/discussions/composer/message-composer/types'

export function useDmComposerAttachments(opts: { groupDmId: string; canAttachFiles: boolean }) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!opts.canAttachFiles) {
      toast.error("You don't have permission to attach files in this conversation")
      return
    }
    Array.from(files).forEach((file) => {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const upload = uploadDiscussionFile({
        file,
        groupDmId: opts.groupDmId,
        keyVersion: 1,
        requireE2eeMetadata: false,
        onProgress: (percent) => {
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, progress: percent } : a))
          )
        }
      })
      setAttachments((prev) => [
        ...prev,
        { localId, file, progress: 0, result: null, error: null, abort: upload.abort }
      ])
      void upload.promise
        .then((result) => {
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, result, progress: 100 } : a))
          )
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setAttachments((prev) =>
            prev.map((a) => (a.localId === localId ? { ...a, error: msg } : a))
          )
          toast.error(`Upload failed: ${file.name}`, { description: msg })
        })
    })
  }

  const removeAttachment = (localId: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId)
      if (target && !target.result) target.abort()
      return prev.filter((a) => a.localId !== localId)
    })
  }

  const clearAttachments = () => setAttachments([])

  const hasPendingUploads = attachments.some((a) => a.result == null && a.error == null)

  return {
    attachments,
    handleFiles,
    removeAttachment,
    clearAttachments,
    hasPendingUploads
  }
}
