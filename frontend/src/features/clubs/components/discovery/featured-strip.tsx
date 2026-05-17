'use client'

import { Icons } from '@/components/icons'
import type { Club } from '../../api/types'

export function FeaturedStrip({
  clubs,
  myClubIds
}: {
  clubs: Club[]
  myClubIds: Set<number>
}) {
  // Show top 5 official or most popular clubs
  const featured = clubs
    .filter((c) => c.isOfficial || c.memberCountCache >= 10)
    .sort((a, b) => {
      // Official first, then by member count
      if (a.isOfficial && !b.isOfficial) return -1
      if (!a.isOfficial && b.isOfficial) return 1
      return b.memberCountCache - a.memberCountCache
    })
    .slice(0, 5)

  if (featured.length === 0) return null

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-2'>
        <Icons.trendingUp className='h-4 w-4 text-amber-500' />
        <h3 className='text-sm font-semibold'>Trending</h3>
      </div>
      <div className='flex gap-3 overflow-x-auto pb-1'>
        {featured.map((club) => {
          const themeColor = club.themeColor || '#6366f1'
          const isMember = myClubIds.has(club.id)
          return (
            <a
              key={club.id}
              href={`/dashboard/clubs/${club.slug}`}
              className='group flex min-w-[200px] items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm'
            >
              {/* Mini icon */}
              <div
                className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold'
                style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
              >
                {club.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={club.iconUrl} alt='' className='h-full w-full rounded-lg object-cover' />
                ) : (
                  club.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
                )}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-1'>
                  <span className='truncate text-sm font-medium group-hover:text-violet-600 dark:group-hover:text-violet-400'>
                    {club.name}
                  </span>
                  {club.isOfficial && (
                    <Icons.circleCheck className='h-3 w-3 shrink-0 text-blue-500' />
                  )}
                </div>
                <div className='flex items-center gap-1.5 text-[10px] text-muted-foreground'>
                  <Icons.teams className='h-3 w-3' />
                  <span>{club.memberCountCache} members</span>
                  {isMember && (
                    <span className='rounded bg-emerald-500/10 px-1 py-px text-emerald-600 dark:text-emerald-400'>
                      Joined
                    </span>
                  )}
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
