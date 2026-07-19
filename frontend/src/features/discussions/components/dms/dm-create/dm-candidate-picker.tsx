'use client'

import type { RefObject } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Icons } from '@/components/icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { GroupDmCandidate } from '../../../api/types'
import { initialsFor } from './constants'

export function DmCandidatePicker({
  name,
  setName,
  search,
  setSearch,
  selected,
  toggle,
  candidates,
  selectedIds,
  isLoading,
  debouncedSearch,
  searchRef,
  atMax,
}: {
  name: string
  setName: (v: string) => void
  search: string
  setSearch: (v: string) => void
  selected: GroupDmCandidate[]
  toggle: (c: GroupDmCandidate) => void
  candidates: GroupDmCandidate[]
  selectedIds: Set<number>
  isLoading: boolean
  debouncedSearch: string
  searchRef: RefObject<HTMLInputElement | null>
  atMax: boolean
}) {
  return (
    <div className='space-y-3'>
      <Input
        placeholder='Optional group name'
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
      />

      {selected.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          {selected.map((c) => (
            <span
              key={c.id}
              className='inline-flex items-center gap-1 rounded-full border bg-muted/60 py-0.5 pl-2 pr-1 text-xs'
            >
              {c.full_name}
              <Button
                variant='ghost'
                size='icon'
                className='h-5 w-5'
                aria-label={`Remove ${c.full_name}`}
                onClick={() => toggle(c)}
              >
                <Icons.close className='h-3 w-3' />
              </Button>
            </span>
          ))}
        </div>
      )}

      <div className='relative'>
        <Icons.search className='absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
        <Input
          ref={searchRef}
          placeholder='Search people…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-7'
        />
      </div>

      <ScrollArea className='h-60 rounded-md border'>
        {isLoading && candidates.length === 0 ? (
          <div className='flex items-center justify-center gap-1 py-8 text-xs text-muted-foreground'>
            <Icons.spinner className='h-3 w-3 animate-spin' />
            Loading…
          </div>
        ) : candidates.length === 0 ? (
          <div className='py-8 text-center text-xs text-muted-foreground'>
            {debouncedSearch ? 'No matches' : 'Type to search'}
          </div>
        ) : (
          <ul className='divide-y'>
            {candidates.map((c) => {
              const isSelected = selectedIds.has(c.id)
              return (
                <li key={c.id}>
                  <button
                    type='button'
                    onClick={() => toggle(c)}
                    disabled={!isSelected && atMax}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/60',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <Avatar className='h-7 w-7 shrink-0'>
                      <AvatarFallback className='text-[10px]'>
                        {initialsFor(c.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-xs font-medium'>{c.full_name}</div>
                      {c.email && (
                        <div className='truncate text-[11px] text-muted-foreground'>
                          {c.email}
                        </div>
                      )}
                    </div>
                    {isSelected && <Icons.check className='h-4 w-4 text-primary' />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>

      {atMax && (
        <p className='text-[11px] text-muted-foreground'>
          You’ve hit the limit. Remove someone to add another.
        </p>
      )}
    </div>
  )
}
