'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Icons } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useMyClubs } from '@/features/clubs/api/queries'
import type { Club } from '@/features/clubs/api/types'

export function ClubsSidebarSection({ activeServerId }: { activeServerId: number | null }) {
  const { data: clubsData, isLoading } = useMyClubs()
  const [collapsed, setCollapsed] = useState(false)

  const allClubs = useMemo(() => {
    const seen = new Set<number>()
    const result: Club[] = []
    for (const club of [...(clubsData?.owned ?? []), ...(clubsData?.memberOf ?? [])]) {
      if (!seen.has(club.id)) {
        seen.add(club.id)
        result.push(club)
      }
    }
    return result
  }, [clubsData])

  if (isLoading) {
    return (
      <div className='flex flex-col'>
        <div className='flex h-7 items-center gap-1 px-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
          Clubs
        </div>
        <Skeleton className='mx-2 h-8 w-full' />
        <Skeleton className='mx-2 mt-1 h-8 w-full' />
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      <div className='group flex h-7 items-center gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
        <button
          type='button'
          onClick={() => setCollapsed((c) => !c)}
          className='flex flex-1 items-center gap-1 truncate text-left transition-colors hover:text-foreground'
        >
          {collapsed ? (
            <Icons.chevronRight className='h-3 w-3' />
          ) : (
            <Icons.chevronDown className='h-3 w-3' />
          )}
          <span className='truncate'>Clubs</span>
        </button>
        <Link
          href='/dashboard/clubs'
          className='flex h-5 w-5 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground'
        >
          <Icons.add className='h-3 w-3' />
        </Link>
      </div>

      {!collapsed && allClubs.length === 0 ? (
        <Link
          href='/dashboard/clubs'
          className='mx-2 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <Icons.add className='h-3 w-3' />
          Browse clubs
        </Link>
      ) : null}

      {!collapsed
        ? allClubs.map((club) => {
            const themeColor = club.themeColor || '#6366f1'
            const isActive = club.serverId === activeServerId
            const initials = club.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() || '')
              .join('')

            return (
              <Link
                key={club.id}
                href={
                  club.serverId
                    ? `/dashboard/chat/${club.serverId}`
                    : `/dashboard/clubs/${club.slug}`
                }
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group/row mx-2 flex h-8 items-center gap-2 rounded-md px-2 text-sm',
                  'transition-colors hover:bg-muted hover:text-foreground',
                  isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                )}
              >
                <span
                  className='flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold'
                  style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                >
                  {club.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={club.iconUrl}
                      alt=''
                      className='h-full w-full rounded object-cover'
                    />
                  ) : (
                    initials
                  )}
                </span>
                <span className='flex-1 truncate'>{club.name}</span>
                {club.status === 'PENDING' ? (
                  <span className='h-1.5 w-1.5 rounded-full bg-yellow-400' />
                ) : null}
              </Link>
            )
          })
        : null}
    </div>
  )
}
