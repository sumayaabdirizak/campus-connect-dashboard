'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DiscussionImageLightbox } from './discussion-image-lightbox'
import type { AttachmentCardModel } from './discussion-attachment-utils'
import {
  fileNameFromUrl,
  resolveAttachmentSrc,
} from './discussion-attachment-utils'

export function DiscussionAttachmentImage({
  attachment,
  className,
}: {
  attachment: AttachmentCardModel
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const href = resolveAttachmentSrc(attachment)
  if (!href) return null

  const name = fileNameFromUrl(attachment.url || href)

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          'block max-w-[min(100%,280px)] overflow-hidden rounded-xl text-left transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F43]/50',
          className
        )}
        aria-label={`View ${name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={href}
          alt={name}
          className='max-h-72 w-full object-cover'
          loading='lazy'
        />
      </button>
      <DiscussionImageLightbox
        src={href}
        alt={name}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
