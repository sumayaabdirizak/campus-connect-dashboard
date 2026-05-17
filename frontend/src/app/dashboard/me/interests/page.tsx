'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Icons } from '@/components/icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useInterestTags,
  useMyInterests,
  useUpdateMyInterests
} from '@/features/clubs/api/queries'
import type { InterestTag } from '@/features/clubs/api/types'

export default function MyInterestsPage() {
  const { data: tagsData, isLoading: tagsLoading } = useInterestTags()
  const { data: myData, isLoading: myLoading } = useMyInterests()
  const updateMutation = useUpdateMyInterests()

  // Local selected set — synced from server on first load
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (myData?.tags && !initialised) {
      setSelected(new Set(myData.tags.map((t) => t.slug)))
      setInitialised(true)
    }
  }, [myData, initialised])

  const allTags = tagsData?.tags ?? []

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, (InterestTag & { category?: string })[]>()
    for (const tag of allTags) {
      const cat = tag.category || 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(tag)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [allTags])

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else if (next.size < 20) {
        next.add(slug)
      }
      return next
    })
  }

  const isDirty = useMemo(() => {
    const mySet = new Set(myData?.tags?.map((t) => t.slug) ?? [])
    if (mySet.size !== selected.size) return true
    for (const s of selected) {
      if (!mySet.has(s)) return true
    }
    return false
  }, [selected, myData])

  const handleSave = () => {
    updateMutation.mutate(Array.from(selected))
  }

  const isLoading = tagsLoading || myLoading

  return (
    <div className='flex h-full flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-6 py-4'>
        <div className='flex items-center gap-3'>
          <Link href='/dashboard/clubs'>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
              <Icons.chevronLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div>
            <h1 className='text-lg font-semibold'>My Interests</h1>
            <p className='text-xs text-muted-foreground'>
              Pick up to 20 interests to get personalised club recommendations
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-xs text-muted-foreground'>
            {selected.size}/20 selected
          </span>
          <Button
            size='sm'
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Icons.spinner className='mr-1.5 h-3.5 w-3.5 animate-spin' />
            ) : (
              <Icons.check className='mr-1.5 h-3.5 w-3.5' />
            )}
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className='flex-1'>
        <div className='mx-auto max-w-2xl space-y-6 p-6'>
          {isLoading ? (
            <div className='space-y-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='space-y-2'>
                  <Skeleton className='h-4 w-24' />
                  <div className='flex flex-wrap gap-2'>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <Skeleton key={j} className='h-8 w-20 rounded-full' />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-16'>
              <Icons.heart className='h-10 w-10 text-muted-foreground/50' />
              <p className='text-sm text-muted-foreground'>
                No interest tags available yet
              </p>
            </div>
          ) : (
            grouped.map(([category, tags]) => (
              <div key={category}>
                <h3 className='mb-2.5 text-sm font-medium text-muted-foreground'>
                  {category}
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {tags.map((tag) => {
                    const isSelected = selected.has(tag.slug)
                    return (
                      <button
                        key={tag.slug}
                        type='button'
                        onClick={() => toggle(tag.slug)}
                        className={`
                          inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5
                          text-sm transition-all
                          ${isSelected
                            ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                            : 'border-border bg-background text-foreground hover:border-violet-300 hover:bg-violet-500/5'}
                        `}
                      >
                        {isSelected && (
                          <Icons.check className='h-3 w-3' />
                        )}
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
