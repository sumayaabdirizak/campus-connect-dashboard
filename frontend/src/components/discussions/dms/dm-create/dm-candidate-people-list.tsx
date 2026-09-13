'use client'

import { Avatar, AvatarFallback } from '@/features/ui/components/avatar'
import { Icons } from '@/components/icons'
import { ScrollArea } from '@/features/ui/components/scroll-area'
import { cn } from '@/lib/utils'
import { avatarGradient } from '@/lib/discussions/services/avatar-color'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { initialsFor } from './constants'
import {
  candidateDisplayName,
  roleLabel,
} from './candidate-hierarchy'

export function DmCandidatePeopleList({
  people,
  selectedIds,
  isLoading,
  emptyLabel,
  atMax,
  toggle,
}: {
  people: GroupDmCandidate[]
  selectedIds: Set<number>
  isLoading: boolean
  emptyLabel: string
  atMax: boolean
  toggle: (c: GroupDmCandidate) => void
}) {
  return (
    <ScrollArea className='h-64 rounded-lg border'>
      {isLoading && people.length === 0 ? (
        <div className='flex items-center justify-center gap-1.5 py-12 text-xs text-muted-foreground'>
          <Icons.spinner className='size-3.5 animate-spin' />
          Loading…
        </div>
      ) : people.length === 0 ? (
        <div className='px-4 py-12 text-center text-xs text-muted-foreground'>
          {emptyLabel}
        </div>
      ) : (
        <ul className='py-1'>
          {people.map((c) => {
            const isSelected = selectedIds.has(c.id)
            const name = candidateDisplayName(c)
            const role = roleLabel(c.role)
            return (
              <li key={c.id}>
                <button
                  type='button'
                  onClick={() => toggle(c)}
                  disabled={!isSelected && atMax}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                    'hover:bg-muted/50 disabled:opacity-50',
                    isSelected && 'bg-[rgba(255,159,67,0.08)]'
                  )}
                >
                  <Avatar className='size-8 shrink-0'>
                    <AvatarFallback
                      className='text-[10px] font-semibold text-white'
                      style={{ background: avatarGradient(name) }}
                    >
                      {initialsFor(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5'>
                      <span className='truncate text-xs font-semibold text-foreground'>
                        {name}
                      </span>
                      {role ? (
                        <span className='shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground'>
                          {role}
                        </span>
                      ) : null}
                    </div>
                    {c.email ? (
                      <div className='truncate text-[11px] text-muted-foreground'>
                        {c.email}
                      </div>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border',
                      isSelected
                        ? 'border-[#FF9F43] bg-[#FF9F43] text-white'
                        : 'border-border text-transparent'
                    )}
                  >
                    <Icons.check className='size-3' />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </ScrollArea>
  )
}
