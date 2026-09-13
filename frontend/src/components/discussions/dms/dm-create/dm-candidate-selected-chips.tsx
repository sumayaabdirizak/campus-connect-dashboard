'use client'

import { Icons } from '@/components/icons'
import { avatarGradient } from '@/lib/discussions/services/avatar-color'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import { initialsFor, MAX_OTHER_MEMBERS, MIN_OTHER_MEMBERS } from './constants'
import { candidateDisplayName } from './candidate-hierarchy'

export function DmCandidateSelectedChips({
  selected,
  toggle,
}: {
  selected: GroupDmCandidate[]
  toggle: (c: GroupDmCandidate) => void
}) {
  if (selected.length === 0) return null

  return (
    <div className='rounded-lg border bg-muted/30 p-2'>
      <div className='mb-1.5 flex items-center justify-between gap-2'>
        <span className='text-[11px] font-medium text-muted-foreground'>
          Selected · {selected.length + 1} total (incl. you)
        </span>
        <span className='text-[10px] text-muted-foreground'>
          Need {Math.max(0, MIN_OTHER_MEMBERS - selected.length)} more · max{' '}
          {MAX_OTHER_MEMBERS}
        </span>
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {selected.map((c) => {
          const label = candidateDisplayName(c)
          return (
            <button
              key={c.id}
              type='button'
              onClick={() => toggle(c)}
              className='inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background py-1 pl-1 pr-2 text-left text-xs transition-colors hover:border-destructive/40'
              aria-label={`Remove ${label}`}
            >
              <span
                className='flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white'
                style={{ background: avatarGradient(label) }}
              >
                {initialsFor(label)}
              </span>
              <span className='truncate font-medium'>{label}</span>
              <Icons.close className='size-3 shrink-0 text-muted-foreground' />
            </button>
          )
        })}
      </div>
    </div>
  )
}
