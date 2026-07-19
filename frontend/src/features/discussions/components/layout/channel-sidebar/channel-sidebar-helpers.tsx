import Link from 'next/link'
import { Icons } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { DiscussionChannel, DiscussionChannelCategory } from '../../../api/types'

export function channelIcon(channel: DiscussionChannel) {
  if (channel.isPrivate) return Icons.lock ?? Icons.hash
  switch (channel.kind) {
    case 'ANNOUNCEMENT':
      return Icons.speakerphone
    case 'FORUM':
      return Icons.chat ?? Icons.hash
    default:
      return Icons.hash
  }
}

export type GroupedChannels = {
  category: DiscussionChannelCategory | null
  channels: DiscussionChannel[]
}

export function groupChannels(
  categories: DiscussionChannelCategory[],
  channels: DiscussionChannel[]
): GroupedChannels[] {
  const byCategoryId = new Map<number | null, DiscussionChannel[]>()
  for (const ch of channels) {
    const key = ch.categoryId ?? null
    if (!byCategoryId.has(key)) byCategoryId.set(key, [])
    byCategoryId.get(key)!.push(ch)
  }

  const sortedCategories = [...categories].toSorted(
    (a, b) => a.position - b.position || a.id - b.id
  )

  const groups: GroupedChannels[] = []
  const uncategorized = byCategoryId.get(null)
  if (uncategorized && uncategorized.length > 0) {
    groups.push({ category: null, channels: uncategorized })
  }
  for (const cat of sortedCategories) {
    const list = byCategoryId.get(cat.id)
    if (!list || list.length === 0) continue
    groups.push({ category: cat, channels: list })
  }
  return groups
}

export function CategoryHeader({
  label,
  collapsed,
  onToggle,
  rightSlot,
}: {
  label: string
  collapsed: boolean
  onToggle: () => void
  rightSlot?: React.ReactNode
}) {
  return (
    <div className='group flex h-7 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
      <button
        type='button'
        onClick={onToggle}
        className='flex flex-1 items-center gap-1 truncate text-left transition-colors hover:text-foreground'
      >
        {collapsed ? (
          <Icons.chevronRight className='h-3 w-3' />
        ) : (
          <Icons.chevronDown className='h-3 w-3' />
        )}
        <span className='truncate'>{label}</span>
      </button>
      {rightSlot}
    </div>
  )
}

export function ChannelRow({
  channel,
  isActive,
  href,
}: {
  channel: DiscussionChannel
  isActive: boolean
  href: string
}) {
  const Icon = channelIcon(channel)
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/row mx-2 flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground',
        'transition-colors hover:bg-muted hover:text-foreground',
        isActive && 'bg-primary/10 text-foreground'
      )}
    >
      <Icon className='h-4 w-4 shrink-0 opacity-70' />
      <span className='flex-1 truncate'>{channel.name}</span>
    </Link>
  )
}
