import { cn } from '@/lib/utils'
import type { InboxRow } from '@/lib/inbox/types'
import { fmtWhen, isClubInboxRow, TYPE_META } from './inbox-helpers'
import { ChatIdentityAvatar, ChatIdentityText } from './chat-identity'

function rowSubtitle(row: InboxRow) {
  if (row.preview) {
    return row.subtitle ? `${row.subtitle} · ${row.preview}` : row.preview
  }
  return row.subtitle || undefined
}

export function InboxRowItem({
  row,
  onOpen,
  isActive,
}: {
  row: InboxRow
  onOpen: (row: InboxRow) => void
  isActive?: boolean
}) {
  const TypeIcon = isClubInboxRow(row)
    ? TYPE_META.club.icon
    : TYPE_META[row.type].icon

  return (
    <button
      type='button'
      onClick={() => onOpen(row)}
      className={cn(
        'flex w-full items-center gap-3 border-0 border-b border-border bg-card px-4 py-3 text-left transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B82F6]/30',
        isActive ? 'bg-primary/10' : 'hover:bg-muted'
      )}
    >
      <ChatIdentityAvatar
        title={row.title}
        avatarUrl={row.avatarUrl}
        badge={<TypeIcon className='size-2.5 text-muted-foreground' aria-hidden />}
      />
      <ChatIdentityText
        title={row.title}
        subtitle={rowSubtitle(row)}
        trailing={fmtWhen(row.timestamp)}
        titleClassName={row.unreadCount > 0 ? 'font-bold' : undefined}
      />
      {row.unreadCount > 0 ? (
        <span className='inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white'>
          {row.unreadCount > 99 ? '99+' : row.unreadCount}
        </span>
      ) : null}
    </button>
  )
}
