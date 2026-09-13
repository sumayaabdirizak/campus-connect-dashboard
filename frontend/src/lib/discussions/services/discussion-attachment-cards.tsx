'use client'

import { DiscussionAttachmentFileCard } from './discussion-attachment-file-card'
import { DiscussionAttachmentImage } from './discussion-attachment-image'
import {
  isImageAttachment,
  resolveAttachmentSrc,
  type AttachmentCardModel,
} from './discussion-attachment-utils'

export type { AttachmentCardModel }

export function DiscussionAttachmentCards({
  attachments,
  tone,
}: {
  attachments: AttachmentCardModel[]
  tone: 'hybrid' | 'legacy'
}) {
  if (attachments.length === 0) return null

  return (
    <div className='mt-1.5 flex w-full max-w-full flex-col gap-1.5'>
      {attachments.map((att) =>
        isImageAttachment(att) && resolveAttachmentSrc(att) ? (
          <DiscussionAttachmentImage key={att.id} attachment={att} />
        ) : (
          <DiscussionAttachmentFileCard
            key={att.id}
            attachment={att}
            tone={tone}
          />
        )
      )}
    </div>
  )
}
