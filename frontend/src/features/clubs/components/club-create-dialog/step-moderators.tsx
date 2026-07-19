'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'

type Candidate = {
  id: number
  full_name: string
  email?: string
}

export function StepModerators({
  modSearch,
  onModSearchChange,
  moderatorIds,
  candidates,
  selectedMods,
  onAdd,
  onRemove,
}: {
  modSearch: string
  onModSearchChange: (v: string) => void
  moderatorIds: number[]
  candidates: Candidate[]
  selectedMods: Candidate[]
  onAdd: (id: number) => void
  onRemove: (id: number) => void
}) {
  return (
    <div className='space-y-3'>
      <div className='space-y-1.5'>
        <Label>Assign Moderators</Label>
        <p className='text-xs text-muted-foreground'>
          Search for users to assign as moderators. They&apos;ll be notified when the club is
          created.
        </p>
        <Input
          placeholder='Search by name or email...'
          value={modSearch}
          onChange={(e) => onModSearchChange(e.target.value)}
          className='h-8'
        />
      </div>

      {moderatorIds.length > 0 ? (
        <div className='flex flex-wrap gap-1.5'>
          {selectedMods.map((u) => (
            <Badge key={u.id} variant='secondary' className='gap-1 pr-1'>
              {u.full_name}
              <button
                type='button'
                onClick={() => onRemove(u.id)}
                className='ml-0.5 rounded-full p-0.5 hover:bg-muted'
              >
                <Icons.close className='h-2.5 w-2.5' />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {modSearch.length >= 2 && candidates.length > 0 ? (
        <div className='max-h-40 space-y-0.5 overflow-y-auto rounded-lg border p-1'>
          {candidates.slice(0, 10).map((u) => (
            <button
              key={u.id}
              type='button'
              className='flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted'
              onClick={() => onAdd(u.id)}
            >
              <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold'>
                {u.full_name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join('')}
              </div>
              <div className='min-w-0 flex-1'>
                <p className='truncate text-xs font-medium'>{u.full_name}</p>
                {u.email ? (
                  <p className='truncate text-[10px] text-muted-foreground'>{u.email}</p>
                ) : null}
              </div>
              <Icons.add className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            </button>
          ))}
        </div>
      ) : null}

      {modSearch.length >= 2 && candidates.length === 0 ? (
        <p className='py-4 text-center text-xs text-muted-foreground'>No users found</p>
      ) : null}
    </div>
  )
}
