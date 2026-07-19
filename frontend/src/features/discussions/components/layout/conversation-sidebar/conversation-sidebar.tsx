'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, MessagesSquare, Megaphone, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useServers, useUnreadSummary } from '../../../api/queries'
import type { DiscussionServer } from '../../../api/types'
import { ConversationRow } from './conversation-row'
import { FilterChips } from './filter-chips'
import type { Filter } from './helpers'

interface ConversationSidebarProps {
  activeServerId: number | null
  activeChannelId: number | null
  className?: string
  announcementsMode?: boolean
}

export function ConversationSidebar({
  activeServerId,
  activeChannelId,
  className,
  announcementsMode = false,
}: ConversationSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (searchParams?.get('filter') === 'favorites') setFilter('favorites')
  }, [searchParams])

  const { data: serversData, isLoading } = useServers()
  const { data: unread } = useUnreadSummary()

  const unreadByGroup = useMemo(() => {
    const m = new Map<number, number>()
    for (const row of unread?.byGroup ?? []) m.set(row.groupId, row.unreadCount)
    return m
  }, [unread])

  const servers: DiscussionServer[] = serversData?.results ?? []

  const counts = useMemo(
    () => ({
      all: servers.length,
      unread: servers.filter((s) => (unreadByGroup.get(s.id) ?? 0) > 0).length,
      faculty: servers.filter((s) => s.kind === 'FACULTY_SERVER').length,
      clubs: servers.filter((s) => s.kind === 'USER_SERVER').length,
    }),
    [servers, unreadByGroup]
  )

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return servers.filter((s) => {
      if (needle && !s.name.toLowerCase().includes(needle)) return false
      if (filter === 'unread') return (unreadByGroup.get(s.id) ?? 0) > 0
      if (filter === 'faculty') return s.kind === 'FACULTY_SERVER'
      if (filter === 'clubs') return s.kind === 'USER_SERVER'
      if (filter === 'favorites') return false
      return true
    })
  }, [servers, search, filter, unreadByGroup])

  const openServer = (s: DiscussionServer) => {
    router.push(
      s.defaultChannelId
        ? `/dashboard/chat/${s.id}/${s.defaultChannelId}`
        : `/dashboard/chat/${s.id}`
    )
  }

  return (
    <aside
      className={cn(
        'h-full w-full flex-col border-r border-border/70 bg-card md:flex md:w-[var(--comm-list-w)] md:shrink-0',
        className ?? 'flex'
      )}
    >
      <div className='shrink-0 space-y-3 border-b border-border/70 px-4 pb-3 pt-4'>
        <div className='flex items-baseline justify-between gap-2'>
          <h2 className='font-display text-lg font-semibold tracking-tight text-foreground'>
            {announcementsMode ? 'Broadcasts' : 'Messages'}
          </h2>
          <span className='text-[11px] tabular-nums text-muted-foreground'>
            {announcementsMode ? 'Campus feed' : `${counts.all} spaces`}
          </span>
        </div>
        <div className='relative'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              announcementsMode ? 'Search announcements…' : 'Search conversations…'
            }
            aria-label={announcementsMode ? 'Search announcements' : 'Search conversations'}
            className='h-9 rounded-full border-0 bg-muted/70 pl-9 text-sm shadow-inner placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring'
          />
        </div>
      </div>

      {!announcementsMode ? (
        <div className='shrink-0 px-4 py-2.5'>
          <FilterChips filter={filter} counts={counts} onChange={setFilter} />
        </div>
      ) : (
        <div className='shrink-0 px-4 py-3'>
          <button
            type='button'
            onClick={() => router.push('/dashboard/chat?view=announcements')}
            className='comm-row flex w-full items-center gap-3 rounded-2xl bg-primary/8 px-3 py-3 text-left ring-1 ring-primary/15'
          >
            <span className='flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm'>
              <Megaphone className='h-5 w-5' />
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block text-sm font-semibold text-foreground'>Announcements</span>
              <span className='block truncate text-xs text-muted-foreground'>
                Faculty & campus broadcasts
              </span>
            </span>
          </button>
        </div>
      )}

      <div className='min-h-0 flex-1 overflow-y-auto py-1.5'>
        {isLoading ? (
          <div className='space-y-1 px-2'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='flex items-center gap-3 rounded-2xl px-3 py-2.5'>
                <div className='h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted' />
                <div className='flex-1 space-y-2'>
                  <div className='h-3 w-3/4 animate-pulse rounded-full bg-muted' />
                  <div className='h-2.5 w-1/2 animate-pulse rounded-full bg-muted' />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && !announcementsMode && filtered.length === 0 ? (
          <div className='flex flex-col items-center gap-3 px-6 py-14 text-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-muted'>
              {filter === 'favorites' ? (
                <Star className='h-7 w-7 text-muted-foreground/45' />
              ) : (
                <MessagesSquare className='h-7 w-7 text-muted-foreground/45' />
              )}
            </div>
            <div>
              <p className='text-sm font-semibold text-foreground'>
                {filter === 'favorites'
                  ? 'No favorites yet'
                  : search
                    ? 'No search results'
                    : 'No conversations yet'}
              </p>
              <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                {filter === 'favorites'
                  ? 'Pin or star spaces from conversation options to collect them here.'
                  : search
                    ? 'Try a different name or keyword.'
                    : 'Faculty channels and club chats will appear here.'}
              </p>
            </div>
          </div>
        ) : null}

        {!announcementsMode ? (
          <div className='space-y-0.5 px-1'>
            {filtered.map((s) => (
              <ConversationRow
                key={s.id}
                server={s}
                activeServerId={activeServerId}
                activeChannelId={activeChannelId}
                unreadCount={unreadByGroup.get(s.id) ?? 0}
                onOpen={() => openServer(s)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
