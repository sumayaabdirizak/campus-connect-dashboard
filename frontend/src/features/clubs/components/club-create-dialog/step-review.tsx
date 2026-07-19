'use client'

import { Badge } from '@/components/ui/badge'
import type { ClubJoinPolicy, ClubScopeKind } from '../../api/types'

type Mod = { id: number; full_name: string }

export function StepReview({
  isDean,
  name,
  tagline,
  description,
  rules,
  joinPolicy,
  scopeKind,
  themeColor,
  moderatorIds,
  selectedMods,
}: {
  isDean: boolean
  name: string
  tagline: string
  description: string
  rules: string
  joinPolicy: ClubJoinPolicy
  scopeKind: ClubScopeKind
  themeColor: string
  moderatorIds: number[]
  selectedMods: Mod[]
}) {
  return (
    <div className='space-y-3'>
      <div className='rounded-lg p-4' style={{ backgroundColor: `${themeColor}10` }}>
        <h4 className='font-semibold' style={{ color: themeColor }}>
          {name}
        </h4>
        {tagline ? (
          <p className='mt-0.5 text-xs text-muted-foreground'>{tagline}</p>
        ) : null}
        <div className='mt-2 flex flex-wrap gap-2 text-xs'>
          <span className='rounded bg-muted px-1.5 py-0.5'>
            {joinPolicy.toLowerCase().replace('_', ' ')}
          </span>
          <span className='rounded bg-muted px-1.5 py-0.5'>{scopeKind.toLowerCase()}</span>
        </div>
        {description ? (
          <p className='mt-2 text-xs text-muted-foreground'>{description}</p>
        ) : null}
      </div>
      {rules ? (
        <div className='rounded-lg border p-3'>
          <p className='mb-1 text-xs font-medium'>Rules</p>
          <p className='whitespace-pre-wrap text-xs text-muted-foreground'>{rules}</p>
        </div>
      ) : null}
      {isDean && moderatorIds.length > 0 ? (
        <div className='rounded-lg border p-3'>
          <p className='mb-1 text-xs font-medium'>Moderators ({moderatorIds.length})</p>
          <div className='flex flex-wrap gap-1'>
            {selectedMods.map((u) => (
              <Badge key={u.id} variant='secondary' className='text-[10px]'>
                {u.full_name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
