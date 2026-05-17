'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/icons'
import { useRecommendedClubs, useMyInterests } from '../../api/queries'
import { ClubCard } from '../club-card'

export function RecommendationsStrip({
  myClubIds
}: {
  myClubIds: Set<number>
}) {
  const { data: recommended } = useRecommendedClubs(6)
  const { data: myInterests } = useMyInterests()
  const hasInterests = (myInterests?.tags?.length ?? 0) > 0
  const clubs = recommended?.clubs ?? []

  if (clubs.length === 0 && !hasInterests) {
    return (
      <div className='rounded-xl border border-dashed p-6'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10'>
            <Icons.sparkles className='h-6 w-6 text-violet-500' />
          </div>
          <div>
            <h3 className='text-sm font-semibold'>Get personalised recommendations</h3>
            <p className='mt-0.5 text-xs text-muted-foreground'>
              Tell us what you're into and we'll suggest clubs you'll love
            </p>
          </div>
          <Link href='/dashboard/me/interests'>
            <Button size='sm' variant='outline' className='gap-1.5'>
              <Icons.heart className='h-3.5 w-3.5' />
              Set My Interests
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (clubs.length === 0) return null

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Icons.sparkles className='h-4 w-4 text-violet-500' />
          <h3 className='text-sm font-semibold'>Picked for You</h3>
        </div>
        <Link href='/dashboard/me/interests'>
          <Button size='sm' variant='ghost' className='h-7 gap-1 text-xs text-muted-foreground'>
            <Icons.settings className='h-3 w-3' />
            Edit interests
          </Button>
        </Link>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {clubs.map((club) => (
          <ClubCard
            key={club.id}
            club={club}
            isMember={myClubIds.has(club.id)}
          />
        ))}
      </div>
    </div>
  )
}
