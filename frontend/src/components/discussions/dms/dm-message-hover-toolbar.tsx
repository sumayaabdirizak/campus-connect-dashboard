'use client'

import { CornerUpLeft } from 'lucide-react'
import { Button } from '@/features/ui/components/button'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import { DM_QUICK_REACTIONS } from './dm-message-helpers'

export function DmMessageHoverToolbar({
  isAuthor,
  canDelete,
  onReply,
  onReact,
  onEdit,
  onDelete,
}: {
  isAuthor: boolean
  canDelete: boolean
  onReply?: () => void
  onReact: (emoji: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div
      data-message-toolbar
      className={cn(
        // Overlay top of bubble (no gap) so hover never drops before click.
        'absolute -top-8 z-20 flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-md',
        'opacity-0 pointer-events-none transition-opacity duration-100',
        isAuthor ? 'right-0' : 'left-0',
        'group-hover/row:pointer-events-auto group-hover/row:opacity-100',
        'group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100',
        // Touch / no-hover: keep actions reachable
        '[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100'
      )}
    >
      {DM_QUICK_REACTIONS.map((emoji) => (
        <Button
          key={emoji}
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-base hover:bg-muted'
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </Button>
      ))}
      {onReply ? (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 hover:bg-muted'
          onClick={(e) => {
            e.stopPropagation()
            onReply()
          }}
          aria-label='Reply'
        >
          <CornerUpLeft className='h-3.5 w-3.5' />
        </Button>
      ) : null}
      {isAuthor ? (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 hover:bg-muted'
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          aria-label='Edit message'
        >
          <Icons.edit className='h-3.5 w-3.5' />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive'
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label='Delete message'
        >
          <Icons.trash className='h-3.5 w-3.5' />
        </Button>
      ) : null}
    </div>
  )
}
