'use client'

import { cn } from '@/lib/utils'
import type { AttachmentCardModel } from './discussion-attachment-utils'
import {
  fileNameFromUrl,
  formatSize,
  resolveAttachmentSrc,
  typeIconLabel,
} from './discussion-attachment-utils'

export function DiscussionAttachmentFileCard({
  attachment,
  tone,
}: {
  attachment: AttachmentCardModel
  tone: 'hybrid' | 'legacy'
}) {
  const href = resolveAttachmentSrc(attachment) || attachment.accessUrl || attachment.url
  const name = fileNameFromUrl(attachment.url || href || '')
  const { label, className: iconClass } = typeIconLabel(attachment.fileType)
  const isHybrid = tone === 'hybrid'
  const e2 = attachment.isE2EE ? ' · E2EE' : ''

  return (
    <a
      href={href || '#'}
      target='_blank'
      rel='noreferrer'
      onClick={(e) => {
        if (!href) e.preventDefault()
      }}
      className={cn(
        'block max-w-md overflow-hidden rounded-lg border text-left transition',
        isHybrid
          ? 'border-border/80 bg-muted/30 hover:border-violet-500/35 hover:bg-muted/50'
          : 'border-zinc-700/90 bg-zinc-900/50 hover:border-[#7c4dff]/40'
      )}
    >
      <div className='flex items-center gap-2.5 px-2.5 py-2'>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded text-[9px] font-bold ring-1',
            isHybrid ? 'bg-background/80' : 'bg-zinc-800',
            iconClass
          )}
        >
          {label}
        </span>
        <div className='min-w-0 flex-1'>
          <div
            className={cn(
              'truncate text-xs font-semibold',
              isHybrid ? 'text-foreground' : 'text-zinc-100'
            )}
          >
            {name}
          </div>
          <div className='text-[10px] text-muted-foreground dark:text-zinc-500'>
            {formatSize(attachment.size)}
            {href ? ' · Open' : ''}
            {e2}
          </div>
        </div>
      </div>
    </a>
  )
}
