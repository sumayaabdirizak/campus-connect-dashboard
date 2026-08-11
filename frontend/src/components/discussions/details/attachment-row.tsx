import type { MessageAttachment } from '@/lib/discussions/queries/types'
import { fileNameFromUrl, formatSize } from './details-helpers'

export type AggregatedAttachment = {
  attachment: MessageAttachment
  messageId: string
  senderName: string
  createdAt: string
}

export function AttachmentRow({ row }: { row: AggregatedAttachment }) {
  const { attachment } = row
  const href = attachment.accessUrl ?? attachment.url
  const name = fileNameFromUrl(attachment.url)

  return (
    <a
      href={href ?? '#'}
      target='_blank'
      rel='noreferrer'
      onClick={(e) => {
        if (!href) e.preventDefault()
      }}
      className='flex items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-muted'
    >
      <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-[9px] font-bold text-muted-foreground ring-1 ring-border'>
        {String(attachment.fileType).slice(0, 3).toUpperCase()}
      </span>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-xs font-medium'>{name}</div>
        <div className='text-[10px] text-muted-foreground'>
          {formatSize(attachment.size)} · from {row.senderName}
        </div>
      </div>
    </a>
  )
}
