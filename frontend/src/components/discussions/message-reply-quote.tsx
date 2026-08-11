'use client'

import { CornerUpLeft, X } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { cn } from '@/lib/utils'

export type ReplyQuoteTarget = {
  id: string
  content?: string | null
  deletedAt?: string | null
  sender?: { id: number; full_name: string } | null
}

function snippet(target: ReplyQuoteTarget): string {
  if (target.deletedAt) return 'Original message was deleted'
  const text = String(target.content ?? '').trim()
  if (!text) return 'Attachment'
  return text.length > 120 ? `${text.slice(0, 117)}…` : text
}

/** Composer banner while drafting a WhatsApp-style reply. */
export function MessageReplyBar({
  replyTo,
  onClear,
  className,
}: {
  replyTo: ReplyQuoteTarget
  onClear: () => void
  className?: string
}) {
  const name = replyTo.sender?.full_name?.trim() || 'Unknown'
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-t border-[#E5E7EB] bg-[#EFF6FF] px-3 py-2.5',
        className
      )}
    >
      <div className='flex min-w-0 items-start gap-2'>
        <CornerUpLeft className='mt-0.5 size-4 shrink-0 text-[#3B82F6]' />
        <div className='min-w-0'>
          <p className='text-xs font-medium text-[#101828]'>Replying to {name}</p>
          <p className='truncate text-xs text-[#667085]'>{snippet(replyTo)}</p>
        </div>
      </div>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-7 shrink-0 text-[#667085] hover:text-[#101828]'
        onClick={onClear}
        aria-label='Cancel reply'
      >
        <X className='size-4' />
      </Button>
    </div>
  )
}

/** Quoted preview inside a message bubble. */
export function MessageReplyQuote({
  replyTo,
  onJump,
  className,
}: {
  replyTo: ReplyQuoteTarget
  onJump?: (messageId: string) => void
  className?: string
}) {
  const name = replyTo.sender?.full_name?.trim() || 'Unknown'
  return (
    <button
      type='button'
      onClick={() => onJump?.(replyTo.id)}
      className={cn(
        'mb-1.5 w-full rounded-md border-l-2 border-[#3B82F6] bg-black/5 px-2 py-1.5 text-left',
        onJump && 'cursor-pointer hover:bg-black/10',
        className
      )}
    >
      <p className='truncate text-[11px] font-semibold text-[#1D4ED8]'>{name}</p>
      <p className='line-clamp-2 text-[11px] text-[#475467]'>{snippet(replyTo)}</p>
    </button>
  )
}
